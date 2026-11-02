import pytest
from fastapi.testclient import TestClient


def test_returns_columns_and_rows(client: TestClient) -> None:
    response = client.get("/datasets/weather-stations")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "weather-stations"
    assert body["name"] == "Weather stations"
    assert body["total_rows"] == 3
    assert body["columns"][0] == {
        "name": "timestamp",
        "type": "datetime",
        "nullable": False,
    }
    assert body["rows"][0] == {
        "timestamp": "2026-10-01T08:00:00",
        "station": "north",
        "temperature": 12.5,
        "samples": 42,
        "active": True,
        "serviced": "2026-09-15",
    }


@pytest.mark.parametrize(
    ("query", "expected_samples"),
    [
        ("", [42, 40, 45]),
        ("?limit=2", [42, 40]),
        ("?offset=1", [40, 45]),
        ("?offset=1&limit=1", [40]),
        ("?limit=0", []),
        ("?offset=10", []),
    ],
)
def test_pages_rows(
    client: TestClient, query: str, expected_samples: list[int]
) -> None:
    body = client.get(f"/datasets/weather-stations{query}").json()

    assert [row["samples"] for row in body["rows"]] == expected_samples
    assert body["total_rows"] == 3


@pytest.mark.parametrize("query", ["?limit=-1", "?offset=-1"])
def test_rejects_negative_paging(client: TestClient, query: str) -> None:
    assert client.get(f"/datasets/weather-stations{query}").status_code == 422


def test_unknown_source_is_not_found(client: TestClient) -> None:
    response = client.get("/datasets/nope")

    assert response.status_code == 404
    assert "No source with id 'nope'" in response.json()["detail"]


@pytest.mark.parametrize(
    ("source_id", "message"),
    [("broken", "Invalid JSON"), ("missing", "Cannot read")],
)
def test_unreadable_source_is_unprocessable(
    client: TestClient, source_id: str, message: str
) -> None:
    response = client.get(f"/datasets/{source_id}")

    assert response.status_code == 422
    assert message in response.json()["detail"]
