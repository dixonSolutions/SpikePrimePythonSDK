"""The bundler, checked by running what it emits."""

import pytest

from spikeprime.build import bundle, has_local_imports
from spikeprime.errors import BuildError


def write(root, files: dict[str, str]) -> None:
    for name, text in files.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)


def run(source: str) -> dict:
    """Execute a bundle the way the hub would: one file, one namespace."""
    namespace: dict = {"__name__": "__main__"}
    exec(compile(source, "<bundle>", "exec"), namespace)  # noqa: S102
    return namespace


def test_flat_project_from_import(tmp_path) -> None:
    write(
        tmp_path,
        {
            "helpers.py": "def double(x):\n    return x * 2\n",
            "main.py": "from helpers import double\n\nresult = double(21)\n",
        },
    )
    result = bundle(tmp_path / "main.py")
    assert result.modules == ["helpers", "main"]
    assert run(result.source)["result"] == 42


def test_import_module_object(tmp_path) -> None:
    write(
        tmp_path,
        {
            "helpers.py": "LIMIT = 7\n\ndef double(x):\n    return x * 2\n",
            "main.py": "import helpers\n\nresult = helpers.double(helpers.LIMIT)\n",
        },
    )
    namespace = run(bundle(tmp_path / "main.py").source)
    assert namespace["result"] == 14
    assert namespace["helpers"].__name__ == "helpers"


def test_dotted_import_keeps_the_path_reachable(tmp_path) -> None:
    write(
        tmp_path,
        {
            "pkg/__init__.py": "",
            "pkg/inner/__init__.py": "",
            "pkg/inner/tools.py": "def shout(word):\n    return word.upper()\n",
            "main.py": "import pkg.inner.tools\n\nresult = pkg.inner.tools.shout('hi')\n",
        },
    )
    assert run(bundle(tmp_path / "main.py").source)["result"] == "HI"


def test_relative_imports_inside_a_package(tmp_path) -> None:
    write(
        tmp_path,
        {
            "robot/__init__.py": "NAME = 'rover'\n",
            "robot/drive.py": "SPEED = 300\n\ndef go():\n    return SPEED\n",
            "robot/main.py": (
                "from . import drive\n"
                "from .drive import go as launch\n"
                "from robot import NAME\n\n"
                "result = (NAME, drive.SPEED, launch())\n"
            ),
        },
    )
    result = bundle(tmp_path / "robot" / "main.py")
    assert result.entry == "robot.main"
    assert run(result.source)["result"] == ("rover", 300, 300)


def test_package_reexporting_its_own_submodule_is_not_a_cycle(tmp_path) -> None:
    write(
        tmp_path,
        {
            "pkg/__init__.py": "from .core import answer\n",
            "pkg/core.py": "def answer():\n    return 42\n",
            "main.py": "from pkg import answer\n\nresult = answer()\n",
        },
    )
    assert run(bundle(tmp_path / "main.py").source)["result"] == 42


def test_external_imports_are_left_alone(tmp_path) -> None:
    write(
        tmp_path,
        {
            "helpers.py": "import math\n\ndef area(r):\n    return math.pi * r * r\n",
            "main.py": "import math\n\nfrom helpers import area\n\nresult = round(area(1), 5)\n",
        },
    )
    source = bundle(tmp_path / "main.py").source
    assert "import math" in source
    assert run(source)["result"] == 3.14159


def test_mixed_import_statement_keeps_its_external_half(tmp_path) -> None:
    write(
        tmp_path,
        {
            "helpers.py": "VALUE = 3\n",
            "main.py": "import math, helpers\n\nresult = math.floor(helpers.VALUE + 0.5)\n",
        },
    )
    source = bundle(tmp_path / "main.py").source
    assert "import math" in source
    assert run(source)["result"] == 3


def test_future_imports_are_hoisted_once(tmp_path) -> None:
    write(
        tmp_path,
        {
            "helpers.py": "from __future__ import annotations\n\ndef pick() -> list[int]:\n"
            "    return [1]\n",
            "main.py": "from __future__ import annotations\n\nfrom helpers import pick\n\n"
            "result = pick()\n",
        },
    )
    source = bundle(tmp_path / "main.py").source
    assert source.count("from __future__ import annotations") == 1
    assert source.index("from __future__") < source.index("# ----")
    assert run(source)["result"] == [1]


def test_main_guard_is_dropped_from_libraries_but_kept_in_the_entry(tmp_path) -> None:
    write(
        tmp_path,
        {
            "helpers.py": (
                "def double(x):\n    return x * 2\n\n"
                'if __name__ == "__main__":\n    raise AssertionError("must not run")\n'
            ),
            "main.py": (
                "from helpers import double\n\n"
                'if __name__ == "__main__":\n    result = double(4)\n'
            ),
        },
    )
    result = bundle(tmp_path / "main.py")
    assert any("__main__" in note for note in result.notes)
    assert run(result.source)["result"] == 8


def test_star_import_is_dropped_with_a_note(tmp_path) -> None:
    write(
        tmp_path,
        {
            "helpers.py": "VALUE = 5\n",
            "main.py": "from helpers import *\n\nresult = VALUE\n",
        },
    )
    result = bundle(tmp_path / "main.py")
    assert any("no-op" in note for note in result.notes)
    assert run(result.source)["result"] == 5


def test_line_numbers_inside_a_module_are_preserved(tmp_path) -> None:
    write(
        tmp_path,
        {
            "helpers.py": "def boom():\n    raise ValueError('x')\n",
            "main.py": "from helpers import boom\n\n\nboom()\n",
        },
    )
    source = bundle(tmp_path / "main.py").source
    lines = source.splitlines()
    # The import was replaced in place, so the call stays on its own line.
    assert "boom()" in lines
    with pytest.raises(ValueError):
        run(source)


def test_top_level_name_collision_is_a_build_error(tmp_path) -> None:
    write(
        tmp_path,
        {
            "left.py": "def helper():\n    return 1\n",
            "right.py": "def helper():\n    return 2\n",
            "main.py": "import left\nimport right\n\nresult = left.helper()\n",
        },
    )
    with pytest.raises(BuildError, match="`helper` is defined at the top level of both"):
        bundle(tmp_path / "main.py")


def test_conflicting_external_names_are_a_build_error(tmp_path) -> None:
    write(
        tmp_path,
        {
            "left.py": "from math import floor as pick\n\nA = pick(1.5)\n",
            "right.py": "from math import ceil as pick\n\nB = pick(1.5)\n",
            "main.py": "import left\nimport right\n\nresult = (left.A, right.B)\n",
        },
    )
    with pytest.raises(BuildError, match="cannot coexist"):
        bundle(tmp_path / "main.py")


def test_same_external_import_in_two_modules_is_fine(tmp_path) -> None:
    write(
        tmp_path,
        {
            "left.py": "from math import floor\n\nA = floor(1.5)\n",
            "right.py": "from math import floor\n\nB = floor(2.5)\n",
            "main.py": "import left\nimport right\n\nresult = (left.A, right.B)\n",
        },
    )
    assert run(bundle(tmp_path / "main.py").source)["result"] == (1, 2)


def test_circular_import_is_a_build_error(tmp_path) -> None:
    write(
        tmp_path,
        {
            "a.py": "from b import beta\n\ndef alpha():\n    return beta()\n",
            "b.py": "from a import alpha\n\ndef beta():\n    return 1\n",
            "main.py": "from a import alpha\n\nresult = alpha()\n",
        },
    )
    with pytest.raises(BuildError, match="circular import"):
        bundle(tmp_path / "main.py")


def test_local_import_inside_a_function_is_a_build_error(tmp_path) -> None:
    write(
        tmp_path,
        {
            "helpers.py": "VALUE = 1\n",
            "main.py": "def go():\n    import helpers\n    return helpers.VALUE\n",
        },
    )
    with pytest.raises(BuildError, match="inside a function or block"):
        bundle(tmp_path / "main.py")


def test_local_import_sharing_a_line_is_a_build_error(tmp_path) -> None:
    write(
        tmp_path,
        {
            "helpers.py": "VALUE = 1\n",
            "main.py": "import helpers; result = helpers.VALUE\n",
        },
    )
    with pytest.raises(BuildError, match="shares a line"):
        bundle(tmp_path / "main.py")


def test_syntax_error_points_at_the_source_file(tmp_path) -> None:
    write(tmp_path, {"helpers.py": "def broken(\n", "main.py": "import helpers\n"})
    with pytest.raises(BuildError, match=r"helpers\.py:1"):
        bundle(tmp_path / "main.py")


def test_missing_entry_is_a_build_error(tmp_path) -> None:
    with pytest.raises(BuildError, match="does not exist"):
        bundle(tmp_path / "nope.py")


def test_has_local_imports(tmp_path) -> None:
    write(
        tmp_path,
        {
            "helpers.py": "VALUE = 1\n",
            "solo.py": "import runloop\nfrom hub import light_matrix\n",
            "needs.py": "from helpers import VALUE\n",
        },
    )
    assert not has_local_imports(tmp_path / "solo.py")
    assert has_local_imports(tmp_path / "needs.py")
    assert not has_local_imports(tmp_path / "absent.py")


def test_cli_build_writes_a_runnable_bundle(tmp_path) -> None:
    from spikeprime.cli import main

    write(
        tmp_path,
        {
            "helpers.py": "def double(x):\n    return x * 2\n",
            "main.py": "from helpers import double\n\nresult = double(21)\n",
        },
    )
    output = tmp_path / "out.py"
    assert main(["build", str(tmp_path / "main.py"), "-o", str(output)]) == 0
    assert run(output.read_text())["result"] == 42


def test_cli_build_reports_a_build_error(tmp_path, capsys) -> None:
    from spikeprime.cli import main

    write(
        tmp_path,
        {
            "left.py": "def helper():\n    return 1\n",
            "right.py": "def helper():\n    return 2\n",
            "main.py": "import left\nimport right\n",
        },
    )
    assert main(["build", str(tmp_path / "main.py")]) == 1
    assert "build error" in capsys.readouterr().err


def test_shipped_example_project_bundles(tmp_path) -> None:
    result = bundle("examples/hub/robot/main.py")
    assert result.entry == "robot.main"
    assert result.modules[-1] == "robot.main"
    compile(result.source, "<bundle>", "exec")  # valid Python, hub modules aside
    assert "import runloop" in result.source
    assert "from robot.hardware import drive" not in result.source
