"""Bundle a multi-module hub project into the single file a program slot holds.

`StartFileUploadRequest` carries one filename and one slot, and the hub runs
that one file. Host-side code can be split across modules; hub-side code cannot.
This module closes that gap: it inlines a project's local imports into one file,
in dependency order, so the source tree can look like a normal codebase.

The model is a **flat namespace** - every module's top-level names end up in one
global scope. That keeps the transform honest: module bodies are copied
verbatim, and the only edits are removing local `import` statements and putting
small binding lines in their place. Nothing inside your code is rewritten, so
what runs on the hub is what you wrote.

The cost is that top-level names must be unique across the project. A clash is a
build error naming both definitions, never silent shadowing.

Imports of modules the project does not contain - `hub`, `motor`, `runloop`,
anything the hub runtime provides - are left exactly where they are.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass, field
from pathlib import Path

from spikeprime.errors import BuildError

_SHIM_CLASS = "_SpikeModule"
_SHIM_PREFIX = "_spike_mod_"


def _shim(dotted: str) -> str:
    return _SHIM_PREFIX + dotted.replace(".", "_")


def _ancestors(dotted: str) -> list[str]:
    parts = dotted.split(".")
    return [".".join(parts[: i + 1]) for i in range(len(parts))]


@dataclass
class BundleResult:
    """A bundled program plus a record of what went into it."""

    source: str
    entry: str
    modules: list[str]
    notes: list[str] = field(default_factory=list)

    def __str__(self) -> str:
        return self.source

    def encode(self, encoding: str = "utf-8") -> bytes:
        """So a result can be handed straight to Hub.upload() or Hub.run()."""
        return self.source.encode(encoding)


@dataclass
class _Module:
    name: str
    path: Path
    source: str
    tree: ast.Module
    is_package: bool
    hard_deps: list[str] = field(default_factory=list)
    soft_deps: list[str] = field(default_factory=list)
    blanks: set[int] = field(default_factory=set)
    edits: dict[int, list[str]] = field(default_factory=dict)
    futures: set[str] = field(default_factory=set)
    defined: dict[str, int] = field(default_factory=dict)
    externals: dict[str, str] = field(default_factory=dict)


def bundle(entry: str | Path, *, root: str | Path | None = None) -> BundleResult:
    """Inline every local import reachable from `entry` into one source file.

    `root` is the directory import names resolve against. It defaults to the
    entry file's own directory, or, for a file inside a package, the directory
    above the outermost package.
    """
    entry_path = Path(entry).resolve()
    if not entry_path.is_file():
        raise BuildError(f"{entry_path} does not exist")
    root_path = Path(root).resolve() if root is not None else _infer_root(entry_path)
    if root_path != entry_path.parent and root_path not in entry_path.parents:
        raise BuildError(f"{entry_path} is not inside the project root {root_path}")
    return _Bundler(root_path).build(entry_path)


def has_local_imports(entry: str | Path, *, root: str | Path | None = None) -> bool:
    """True if `entry` imports anything from its own project, and so needs bundling."""
    entry_path = Path(entry).resolve()
    if not entry_path.is_file():
        return False
    root_path = Path(root).resolve() if root is not None else _infer_root(entry_path)
    try:
        tree = ast.parse(entry_path.read_text(encoding="utf-8"))
    except (SyntaxError, UnicodeDecodeError, OSError):
        return False
    package = _package_of(_module_name(entry_path, root_path), entry_path)
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            if any(_resolve(root_path, alias.name) for alias in node.names):
                return True
        elif isinstance(node, ast.ImportFrom):
            if node.module == "__future__":
                continue
            target = _absolute(node, package)
            if target and _resolve(root_path, target):
                return True
    return False


def _infer_root(entry: Path) -> Path:
    """Walk out of any enclosing packages so `from .x import y` resolves."""
    directory = entry.parent
    while (directory / "__init__.py").is_file() and directory.parent != directory:
        directory = directory.parent
    return directory


def _module_name(path: Path, root: Path) -> str:
    parts = list(path.relative_to(root).parts)
    if parts[-1] == "__init__.py":
        parts.pop()
    else:
        parts[-1] = parts[-1][: -len(".py")]
    return ".".join(parts)


def _package_of(name: str, path: Path) -> str:
    """The package that a module's relative imports resolve against."""
    return name if path.name == "__init__.py" else name.rpartition(".")[0]


def _resolve(root: Path, dotted: str) -> Path | None:
    """Locate a dotted module inside the project, or None if it is external."""
    if not dotted:
        return None
    parts = dotted.split(".")
    if not all(part.isidentifier() for part in parts):
        return None
    base = root.joinpath(*parts)
    if (base / "__init__.py").is_file():
        return base / "__init__.py"
    module = base.with_name(parts[-1] + ".py")
    return module if module.is_file() else None


def _absolute(node: ast.ImportFrom, package: str) -> str | None:
    """Turn `from . import x` / `from ..a import b` into an absolute module name."""
    if node.level == 0:
        return node.module
    parts = package.split(".") if package else []
    if node.level - 1 > len(parts):
        return None
    base = parts[: len(parts) - (node.level - 1)]
    if node.module:
        base = base + node.module.split(".")
    return ".".join(base)


def _external_bindings(node: ast.Import | ast.ImportFrom) -> dict[str, str]:
    """Names an import binds, mapped to a canonical target.

    Two modules importing the same thing must not look like a collision, so the
    target identifies what the name refers to rather than the statement text.
    """
    bindings: dict[str, str] = {}
    if isinstance(node, ast.Import):
        for alias in node.names:
            if alias.asname:
                bindings[alias.asname] = f"module {alias.name}"
            else:
                root = alias.name.split(".")[0]
                bindings[root] = f"module {root}"
    else:
        prefix = "." * node.level + (node.module or "")
        for alias in node.names:
            if alias.name != "*":
                bindings[alias.asname or alias.name] = f"{prefix}.{alias.name}"
    return bindings


class _Bundler:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.modules: dict[str, _Module] = {}
        self.shims: set[str] = set()
        self.notes: list[str] = []

    def build(self, entry_path: Path) -> BundleResult:
        entry = _module_name(entry_path, self.root)
        self._load(entry, entry_path)
        order = self._order(entry)

        header = [
            f"# Bundled by spikeprime from {entry_path.relative_to(self.root)}",
            f"# Modules ({len(order)}): " + ", ".join(order),
            "# Generated file - edit the sources and rebuild.",
        ]
        futures = sorted({f for m in self.modules.values() for f in m.futures})
        if futures:
            header.append("")
            header.extend(f"from __future__ import {name}" for name in futures)

        chunks = [self._preamble()]
        chunks.extend(self._emit(self.modules[name], is_entry=name == entry) for name in order)
        body = "\n".join(chunk for chunk in chunks if chunk)
        return BundleResult(
            source="\n".join(header) + "\n\n" + body.rstrip("\n") + "\n",
            entry=entry,
            modules=order,
            notes=self.notes,
        )

    # -- loading ---------------------------------------------------------

    def _load(self, name: str, path: Path) -> None:
        if name in self.modules:
            return
        try:
            source = path.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            raise BuildError(f"{path} is not valid UTF-8") from exc
        try:
            tree = ast.parse(source, filename=str(path))
        except SyntaxError as exc:
            raise BuildError(f"{path}:{exc.lineno}: {exc.msg}") from exc

        module = _Module(
            name=name,
            path=path,
            source=source,
            tree=tree,
            is_package=path.name == "__init__.py",
        )
        self.modules[name] = module

        parent = name.rpartition(".")[0]
        if parent:
            parent_path = _resolve(self.root, parent)
            if parent_path is not None:
                self._load(parent, parent_path)
                module.soft_deps.append(parent)

        self._scan(module)

    def _scan(self, module: _Module) -> None:
        top_level = {id(node) for node in module.tree.body}
        starts: dict[int, int] = {}
        for node in module.tree.body:
            starts[node.lineno] = starts.get(node.lineno, 0) + 1
        package = _package_of(module.name, module.path)

        for node in ast.walk(module.tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                self._scan_import(module, node, package, id(node) in top_level, starts)
        for node in module.tree.body:
            self._scan_binding(module, node)

    def _scan_import(
        self,
        module: _Module,
        node: ast.Import | ast.ImportFrom,
        package: str,
        is_top_level: bool,
        starts: dict[int, int],
    ) -> None:
        if isinstance(node, ast.ImportFrom) and node.module == "__future__":
            module.futures.update(alias.name for alias in node.names)
            module.blanks.update(range(node.lineno, (node.end_lineno or node.lineno) + 1))
            return

        replacement, deps, local = self._classify(module, node, package)
        if not local:
            module.externals.update(_external_bindings(node))
            return

        if not is_top_level:
            raise BuildError(
                f"{self._where(module, node)}: local import inside a function or block "
                f"(`{ast.unparse(node)}`). A bundle puts every module at the top level, "
                "so move this import to the top of the file."
            )
        if starts.get(node.lineno, 0) > 1:
            raise BuildError(
                f"{self._where(module, node)}: local import shares a line with another "
                "statement. Put it on its own line."
            )

        module.hard_deps.extend(deps)
        module.blanks.update(range(node.lineno, (node.end_lineno or node.lineno) + 1))
        if replacement:
            module.edits[node.lineno] = replacement

    def _classify(
        self,
        module: _Module,
        node: ast.Import | ast.ImportFrom,
        package: str,
    ) -> tuple[list[str], list[str], bool]:
        """Return (replacement lines, local dependencies, touches-a-local-module)."""
        lines: list[str] = []
        deps: list[str] = []

        if isinstance(node, ast.Import):
            paths = {alias.name: _resolve(self.root, alias.name) for alias in node.names}
            if not any(paths.values()):
                return [], [], False
            for alias in node.names:
                path = paths[alias.name]
                if path is None:
                    # A mixed statement: keep the external half verbatim.
                    lines.append(ast.unparse(ast.Import(names=[alias])))
                    module.externals.update(_external_bindings(ast.Import(names=[alias])))
                    continue
                self._load(alias.name, path)
                deps.append(alias.name)
                if alias.asname:
                    self._need_shim(alias.name)
                    lines.append(f"{alias.asname} = {_shim(alias.name)}")
                    module.defined.setdefault(alias.asname, node.lineno)
                else:
                    # `import a.b` binds `a`, and `a.b` must be reachable from it.
                    for ancestor in _ancestors(alias.name):
                        self._need_shim(ancestor)
                    root = alias.name.split(".")[0]
                    lines.append(f"{root} = {_shim(root)}")
                    module.defined.setdefault(root, node.lineno)
            return lines, deps, True

        target = _absolute(node, package)
        if target is None:
            raise BuildError(
                f"{self._where(module, node)}: relative import reaches above the "
                f"project root {self.root}"
            )
        path = _resolve(self.root, target)
        if path is None:
            return [], [], False

        self._load(target, path)
        deps.append(target)
        for alias in node.names:
            if alias.name == "*":
                self.notes.append(
                    f"{module.name}: `from {target} import *` is a no-op in a flat "
                    "namespace and was dropped"
                )
                continue
            submodule = f"{target}.{alias.name}"
            sub_path = _resolve(self.root, submodule)
            if sub_path is not None:
                self._load(submodule, sub_path)
                deps.append(submodule)
                self._need_shim(submodule)
                bound = alias.asname or alias.name
                lines.append(f"{bound} = {_shim(submodule)}")
                module.defined.setdefault(bound, node.lineno)
            elif alias.asname:
                # `from m import n as z` in a flat namespace is just an alias.
                lines.append(f"{alias.asname} = {alias.name}")
                module.defined.setdefault(alias.asname, node.lineno)
        return lines, deps, True

    def _need_shim(self, dotted: str) -> None:
        self.shims.add(dotted)

    def _scan_binding(self, module: _Module, node: ast.AST) -> None:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            module.defined.setdefault(node.name, node.lineno)
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                for name in _target_names(target):
                    module.defined.setdefault(name, node.lineno)
        elif isinstance(node, ast.AnnAssign) and node.value is not None:
            for name in _target_names(node.target):
                module.defined.setdefault(name, node.lineno)

    # -- ordering --------------------------------------------------------

    def _order(self, entry: str) -> list[str]:
        order: list[str] = []
        done: set[str] = set()
        stack: list[str] = []

        def visit(name: str) -> None:
            if name in done:
                return
            if name in stack:
                cycle = " -> ".join(stack[stack.index(name) :] + [name])
                raise BuildError(
                    f"circular import: {cycle}. A bundle emits each module once, in "
                    "dependency order, so cycles cannot be represented."
                )
            stack.append(name)
            module = self.modules[name]
            for dep in module.soft_deps:
                if dep not in stack:  # a package that re-exports its own submodule
                    visit(dep)
            for dep in module.hard_deps:
                visit(dep)
            stack.pop()
            done.add(name)
            order.append(name)

        visit(entry)
        self._check_collisions(order)
        return order

    def _check_collisions(self, order: list[str]) -> None:
        owners: dict[str, str] = {}
        for name in order:
            module = self.modules[name]
            for bound in module.defined:
                previous = owners.get(bound)
                if previous is not None and previous != name:
                    raise BuildError(
                        f"`{bound}` is defined at the top level of both "
                        f"{self._rel(previous)} and {self._rel(name)}. A bundle is one "
                        "flat namespace, so rename one of them."
                    )
                owners[bound] = name

        seen: dict[str, tuple[str, str]] = {}
        for name in order:
            module = self.modules[name]
            for bound, target in module.externals.items():
                if bound in owners:
                    raise BuildError(
                        f"`{bound}` is imported by {self._rel(name)} but also defined "
                        f"at the top level of {self._rel(owners[bound])}. Rename one "
                        "of them."
                    )
                previous = seen.get(bound)
                if previous is not None and previous[1] != target:
                    raise BuildError(
                        f"`{bound}` refers to `{previous[1]}` in {previous[0]} but to "
                        f"`{target}` in {self._rel(name)}. A bundle is one flat "
                        "namespace, so these cannot coexist."
                    )
                seen[bound] = (self._rel(name), target)

    # -- emission --------------------------------------------------------

    def _preamble(self) -> str:
        if not self.shims:
            return ""
        lines = [
            f"class {_SHIM_CLASS}:",
            "    def __init__(self, name):",
            "        self.__name__ = name",
            "",
        ]
        for name in sorted(self.shims):
            lines.append(f'{_shim(name)} = {_SHIM_CLASS}("{name}")')
        for name in sorted(self.shims):
            parent, _, leaf = name.rpartition(".")
            if parent and parent in self.shims:
                lines.append(f"{_shim(parent)}.{leaf} = {_shim(name)}")
        lines.append("")
        return "\n".join(lines)

    def _emit(self, module: _Module, *, is_entry: bool) -> str:
        lines = module.source.splitlines()
        if not is_entry:
            self._strip_main_guard(module, lines)
        for lineno in sorted(module.blanks):
            if 1 <= lineno <= len(lines):
                lines[lineno - 1] = ""
        for lineno, replacement in module.edits.items():
            if 1 <= lineno <= len(lines):
                lines[lineno - 1] = "\n".join(replacement)

        relative = module.path.relative_to(self.root)
        out = [f"# ---- {module.name} ({relative}) ----", *lines]
        if module.name in self.shims:
            out.append("")
            out.append(f"# reachable as `{module.name}` through an import statement")
            for bound in sorted(set(module.defined) | set(module.externals)):
                out.append(f"{_shim(module.name)}.{bound} = {bound}")
        out.append("")
        return "\n".join(out)

    def _strip_main_guard(self, module: _Module, lines: list[str]) -> None:
        """`if __name__ == "__main__":` never runs on import; it must not run here."""
        for node in module.tree.body:
            if not isinstance(node, ast.If) or not _is_main_guard(node.test):
                continue
            for lineno in range(node.lineno, (node.end_lineno or node.lineno) + 1):
                if 1 <= lineno <= len(lines):
                    lines[lineno - 1] = ""
            self.notes.append(
                f'{module.name}: dropped its `if __name__ == "__main__":` block, which '
                "would otherwise run inside the bundle"
            )

    def _rel(self, name: str) -> str:
        return str(self.modules[name].path.relative_to(self.root))

    def _where(self, module: _Module, node: ast.AST) -> str:
        return f"{module.path.relative_to(self.root)}:{getattr(node, 'lineno', '?')}"


def _target_names(target: ast.expr) -> list[str]:
    if isinstance(target, ast.Name):
        return [target.id]
    if isinstance(target, (ast.Tuple, ast.List)):
        names: list[str] = []
        for element in target.elts:
            names.extend(_target_names(element))
        return names
    return []


def _is_main_guard(test: ast.expr) -> bool:
    if not isinstance(test, ast.Compare) or len(test.ops) != 1:
        return False
    if not isinstance(test.ops[0], ast.Eq):
        return False
    left, right = test.left, test.comparators[0]
    if isinstance(right, ast.Name) and isinstance(left, ast.Constant):
        left, right = right, left
    return (
        isinstance(left, ast.Name)
        and left.id == "__name__"
        and isinstance(right, ast.Constant)
        and right.value == "__main__"
    )
