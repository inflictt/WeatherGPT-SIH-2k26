#!/usr/bin/env python3
"""
Run the engine tests without pytest.

`pytest` is the normal way (`pip install -r requirements.txt && pytest -q`),
but the suite is written as plain classes and asserts, so this runner exercises
exactly the same tests anywhere Python 3.10+ exists.

    python tests/run.py
"""
import importlib.util
import inspect
import sys
import traceback
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

GREEN, RED, DIM, RESET = "\033[32m", "\033[31m", "\033[2m", "\033[0m"


def load(path: Path):
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    passed, failed = 0, []
    for path in sorted(HERE.glob("test_*.py")):
        module = load(path)
        print(f"\n{DIM}{path.name}{RESET}")
        for _, cls in sorted(inspect.getmembers(module, inspect.isclass)):
            if not cls.__name__.startswith("Test") or cls.__module__ != module.__name__:
                continue
            print(f"  {cls.__name__}")
            for name, fn in sorted(inspect.getmembers(cls, inspect.isfunction)):
                if not name.startswith("test_"):
                    continue
                try:
                    fn(cls())
                    passed += 1
                    print(f"    {GREEN}·{RESET} {name.replace('_', ' ')}")
                except Exception:
                    failed.append((f"{path.name}::{cls.__name__}::{name}", traceback.format_exc()))
                    print(f"    {RED}✗ {name.replace('_', ' ')}{RESET}")

    print(f"\n{'─' * 60}")
    for name, tb in failed:
        print(f"\n{RED}FAILED{RESET} {name}\n{tb}")
    total = passed + len(failed)
    colour = GREEN if not failed else RED
    print(f"{colour}{passed}/{total} passed{RESET}\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
