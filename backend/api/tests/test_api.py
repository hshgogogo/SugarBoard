from __future__ import annotations

from fastapi.testclient import TestClient

from ssboard_api.main import app


client = TestClient(app)


def test_bootstrap_filters_returns_default_scope() -> None:
    response = client.get("/api/v1/bootstrap/filters")

    assert response.status_code == 200
    payload = response.json()

    assert payload["data"]["default_filters"]["window"] == "30d"
    assert payload["data"]["available_dates"]
    assert payload["data"]["sources"]
    assert payload["meta"]["request_id"]


def test_home_and_ranking_routes_return_contract_shape() -> None:
    home_response = client.get("/api/v1/home/overview")
    ranking_response = client.get("/api/v1/rankings/series?page=1&page_size=5&sort_by=score&sort_order=desc")

    assert home_response.status_code == 200
    assert ranking_response.status_code == 200

    home_payload = home_response.json()
    ranking_payload = ranking_response.json()

    assert len(home_payload["data"]["ranking_panels"]) == 4
    assert home_payload["data"]["analysis_panels"]
    assert ranking_payload["data"]["ranking_type"] == "series"
    assert len(ranking_payload["data"]["items"]) == 5
    assert ranking_payload["meta"]["pagination"]["page_size"] == 5


def test_entity_detail_route_supports_drilldown_from_ranking() -> None:
    ranking_payload = client.get("/api/v1/rankings/series").json()
    entity_id = ranking_payload["data"]["items"][0]["entity"]["id"]

    response = client.get(f"/api/v1/entities/work/{entity_id}")

    assert response.status_code == 200
    payload = response.json()

    assert payload["data"]["entity"]["entity_type"] == "work"
    assert payload["data"]["metric_cards"]
    assert payload["data"]["trend_panels"]
    assert payload["data"]["provenance"]["sources"]


def test_analysis_job_success_and_guardrails() -> None:
    success_response = client.post(
        "/api/v1/analysis/jobs",
        json={"question": "最近一周电影热榜前十是谁？"},
    )
    refine_response = client.post(
        "/api/v1/analysis/jobs",
        json={"question": "帮我分析一下整个市场"},
    )
    rejected_response = client.post(
        "/api/v1/analysis/jobs",
        json={"question": "drop table users"},
    )

    assert success_response.status_code == 200
    assert success_response.json()["data"]["job"]["status"] == "succeeded"
    assert success_response.json()["data"]["job"]["result"]["table_preview"]["rows"]

    assert refine_response.status_code == 200
    assert refine_response.json()["data"]["job"]["status"] in {"blocked", "needs_refine"}

    assert rejected_response.status_code == 422
    assert rejected_response.json()["error"]["code"] == "GUARDRAIL_REJECTED"


def test_invalid_filter_returns_contract_error() -> None:
    response = client.get("/api/v1/home/overview?source_ids=not-a-uuid")

    assert response.status_code == 400
    payload = response.json()

    assert payload["error"]["code"] == "INVALID_FILTER"
    assert payload["meta"]["request_id"]

def test_ranking_missing_as_of_falls_back_with_warning() -> None:
    response = client.get('/api/v1/rankings/series?as_of=2026-01-01')

    assert response.status_code == 200
    warning_codes = {item['code'] for item in response.json()['meta']['warnings']}
    assert 'AS_OF_FALLBACK_APPLIED' in warning_codes


def test_analysis_async_job_can_cancel() -> None:
    response = client.post(
        '/api/v1/analysis/jobs',
        json={'question': '对比《苍穹之城》《雾港迷踪》《星河归途》最近90天走势'},
    )
    assert response.status_code == 202
    job_id = response.json()['data']['job']['id']

    cancel_response = client.post(f'/api/v1/analysis/jobs/{job_id}/cancel')
    assert cancel_response.status_code == 202
    assert cancel_response.json()['data']['job']['status'] == 'cancelled'
