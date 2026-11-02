from importlib.metadata import version
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from conspectus.config import ConfigError, Settings
from conspectus.main import create_app


def test_app_version_matches_package_version() -> None:
    assert create_app().version == version("conspectus")


def test_startup_fails_without_configuration(tmp_path: Path) -> None:
    app = create_app(Settings(sources=tmp_path / "sources.yaml"))

    with pytest.raises(ConfigError, match="Copy sources.example.yaml"), TestClient(app):
        pass


def test_startup_fails_with_invalid_configuration(tmp_path: Path) -> None:
    config = tmp_path / "sources.yaml"
    config.write_text("sources: [{name: A, format: csv}]", encoding="utf-8")
    app = create_app(Settings(sources=config))

    with pytest.raises(ConfigError, match="source 1 \\('A'\\)"), TestClient(app):
        pass
