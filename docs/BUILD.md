# Building multi-file hub programs

A program slot holds one file. `StartFileUploadRequest` carries a single
filename and slot, and the hub runs that file — there is no documented way to
make one slot's program import another file on the hub.

`spikeprime build` removes that constraint from your source tree. You write a
normal multi-module project; the bundler inlines it into the one file the slot
wants, just before upload.

```
robot/
├── __init__.py
├── main.py              entry point
└── hardware/
    ├── __init__.py
    ├── drive.py
    └── eyes.py
```

```bash
spikeprime build robot/main.py -o build/program.py   # inspect the output
spikeprime upload robot/main.py --run                # bundles automatically
```

```python
from spikeprime import bundle, connect

program = bundle("robot/main.py")
async with await connect() as hub:
    await hub.run(program.source, slot=0)
```

`upload` and `run` bundle on their own when the entry file imports something
from the project, and print how many modules went in. `--no-bundle` uploads the
file verbatim.

## What the bundler does

Modules are emitted in dependency order into **one flat namespace**. Module
bodies are copied verbatim — the only edits are removing local `import`
statements and putting binding lines where they were. Nothing inside your code
is rewritten, so what runs on the hub is what you wrote, and a line inside a
module keeps its line number relative to that module's header comment.

| You write | The bundle contains |
|---|---|
| `from .drive import forward` | nothing — `forward` is already in scope |
| `from .drive import forward as go` | `go = forward` |
| `from . import drive` | `drive = <module object for robot.hardware.drive>` |
| `import robot.hardware.drive` | `robot = <module object>`, with `.hardware.drive` chained |
| `from .drive import *` | nothing; dropped with a note |
| `import motor`, `from hub import port` | kept exactly where they were |

Imports the project does not contain — `hub`, `motor`, `runloop`,
`color_sensor`, anything the runtime provides — are never touched.

Modules that are imported as objects get a small shim class so attribute access
works:

```python
class _SpikeModule:
    def __init__(self, name):
        self.__name__ = name
```

Shim objects are all created in a preamble and populated after each module's
body runs, so attribute availability matches real import ordering.

## What it refuses to do

The bundler fails the build rather than emitting something subtly different
from what your imports meant:

- **Top-level name collisions.** One flat namespace means one `helper`. If two
  modules both define it at the top level, the error names both files. Rename
  one.
- **A name that is both imported and defined**, or one external name meaning
  two different things (`from math import floor as pick` in one module,
  `ceil as pick` in another).
- **Circular imports.** Each module is emitted once, in dependency order, so a
  cycle has no valid ordering. A package `__init__.py` that re-exports its own
  submodule is not a cycle and works fine.
- **Local imports inside a function or an `if` block.** Everything lands at the
  top level, so a deferred import cannot keep its meaning. Move it to the top.
- **A local import sharing a line** with another statement (`import helpers;
  go()`), since the line is replaced wholesale.

## Two adjustments it makes for you

- `from __future__ import ...` lines are hoisted to the top of the bundle and
  deduplicated. Scattered through a concatenation they would be a syntax error.
- `if __name__ == "__main__":` blocks are **dropped from non-entry modules**.
  They never run on import, so running them in a bundle would be wrong. The
  entry module keeps its guard, and the build reports each block it dropped.

## Known limits

Only straightforward top-level definitions are tracked for collision checking:
`def`, `async def`, `class`, and plain assignments. A name bound inside a
top-level `if`/`try` block is invisible to the check, so a collision there would
reach the hub. The same applies to names created dynamically (`globals()[...]`).

Module objects hold references captured after the body runs. Rebinding a
module-level name later in the program will not be visible through the shim.
