from fastapi.testclient import TestClient


def test_lists_all_sources_including_unreadable_ones(client: TestClient) -> None:
    response = client.get("/sources")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": "weather-stations",
            "name": "Weather stations",
            "description": "Hourly readings",
            "format": "json",
        },
        {"id": "broken", "name": "Broken", "description": None, "format": "json"},
        {"id": "missing", "name": "Missing", "description": None, "format": "json"},
    ]
