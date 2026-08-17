# Packaging and releases

> The expanded version of this page lives on the documentation site:
> <https://dixonsolutions.github.io/SpikePrimePythonSDK/docs/packaging-and-releases>.

Every push to `main` that passes tests publishes a new version of **SpikePrimePythonSDK**.

## What CI does

1. Run `pytest`
2. Set the version to `0.1.{github.run_number}`
3. Build the wheel and sdist
4. Create a git tag `v0.1.N` and a GitHub Release with those files
5. Rebuild the [PEP 503](https://peps.python.org/pep-0503/) index from **all** release artifacts
6. Deploy that index to GitHub Pages

Skip a release with `[skip release]` in the commit message.

Manual run: Actions → Release → Run workflow.

## Install from the Pages index

```bash
pip install SpikePrimePythonSDK \
  --index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/ \
  --extra-index-url https://pypi.org/simple
```

`--index-url` is this project’s index. `--extra-index-url` is PyPI, so `bleak` still resolves.
Import the library as `import spikeprime`.

Git, without Pages:

```bash
pip install git+https://github.com/dixonSolutions/SpikePrimePythonSDK.git
```

A specific tag:

```bash
pip install git+https://github.com/dixonSolutions/SpikePrimePythonSDK.git@v0.1.1
```

## Local build

```bash
python -m pip install build
python -m build
python scripts/write_simple_index.py \
  --dist dist \
  --site site \
  --repo-url https://github.com/dixonSolutions/SpikePrimePythonSDK \
  --pages-url https://dixonsolutions.github.io/SpikePrimePythonSDK \
  --version 0.1.0
```

The package is not published to PyPI. The public install path is GitHub Pages.
