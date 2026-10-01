from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "NiyamSetu API"
    print(" Root endpoint test passed!")


def test_create_and_get_business_profile():
    payload = {
        "enterprise_name": "AgroFresh Bio Industries Ltd.",
        "business_type": "Food Processing Unit",
        "state": "Maharashtra",
        "investment_inr": 5000000.0,
        "employee_count": 20,
    }

    # Test POST /api/v1/business/profile
    post_res = client.post("/api/v1/business/profile", json=payload)
    assert post_res.status_code == 201, f"POST failed: {post_res.text}"
    created_data = post_res.json()

    assert "id" in created_data
    business_id = created_data["id"]
    assert created_data["enterprise_name"] == payload["enterprise_name"]
    assert created_data["business_type"] == payload["business_type"]
    assert created_data["state"] == payload["state"]
    assert created_data["investment_inr"] == payload["investment_inr"]
    assert created_data["employee_count"] == payload["employee_count"]
    print(f" POST /api/v1/business/profile passed! Created ID: {business_id}")

    # Test GET /api/v1/business/{business_id}
    get_res = client.get(f"/api/v1/business/{business_id}")
    assert get_res.status_code == 200, f"GET failed: {get_res.text}"
    fetched_data = get_res.json()
    assert fetched_data["id"] == business_id
    assert fetched_data["enterprise_name"] == payload["enterprise_name"]
    print(" GET /api/v1/business/{business_id} passed!")

    # Test GET 404 for non-existent business
    not_found_res = client.get("/api/v1/business/non-existent-uuid-999")
    assert not_found_res.status_code == 404
    print(" GET 404 test passed!")


if __name__ == "__main__":
    test_root_endpoint()
    test_create_and_get_business_profile()
    print("\nAll backend integration tests passed successfully!")
