import shutil
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from conspectus.config import Settings
from conspectus.main import create_app

FIXTURES = Path(__file__).parent.parent / "fixtures"


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    """A client for an app with one readable, one broken and one missing source."""
    shutil.copy(FIXTURES / "measurements.json", tmp_path / "measurements.json")
    (tmp_path / "broken.json").write_text("[{", encoding="utf-8")
    config = tmp_path / "sources.yaml"
    config.write_text(
        """
sources:
  - name: Weather stations
    description: Hourly readings
    format: json
    path: measurements.json
  - name: Broken
    format: json
    path: broken.json
  - name: Missing
    format: json
    path: missing.json
""",
        encoding="utf-8",
    )

    with TestClient(create_app(Settings(sources=config))) as client:
        yield client
