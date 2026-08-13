# Packaging and releases

Every push to `main` that passes tests publishes a new version.

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
pip install spikeprime \
  --index-url https://dixonsolutions.github.io/spikeprime/simple/ \
  --extra-index-url https://pypi.org/simple
```

`--index-url` is this project’s index. `--extra-index-url` is PyPI, so `bleak` still resolves.

Git, without Pages:

```bash
pip install git+https://github.com/dixonSolutions/spikeprime.git
```

A specific tag:

```bash
pip install git+https://github.com/dixonSolutions/spikeprime.git@v0.1.1
```

## Local build

```bash
python -m pip install build
python -m build
python scripts/write_simple_index.py \
  --dist dist \
  --site site \
  --repo-url https://github.com/dixonSolutions/spikeprime \
  --pages-url https://dixonsolutions.github.io/spikeprime \
  --version 0.1.0
```

The package is not published to PyPI. The public install path is GitHub Pages.
