"""
WeatherGPT AI service.

Importing any module in this package loads `ai/.env` first, so a locally
configured LLM key is picked up without a dependency and without a shell
wrapper. It lives here rather than in `config.py` because `llm.py` does not
import `config`, and the whole point is that the key is found wherever the
entry point happens to be.

Real environment variables always win over the file, so a deployed service that
sets them properly is unaffected.
"""
import os
from pathlib import Path


def _load_dotenv() -> None:
    """Read `ai/.env` into the environment if it exists.

    Ten lines rather than a dependency. The server side uses `dotenv`; here the
    entire requirement is "KEY=value, ignore comments", and §2 of the PRD is
    explicit about not paying for ceremony that returns nothing at this size.
    """
    path = Path(__file__).resolve().parents[1] / ".env"
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError:
        return
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        # setdefault, not assignment: a real environment variable wins.
        os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()
