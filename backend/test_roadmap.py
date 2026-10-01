from fastapi.testclient import TestClient
from app.main import app


def test_roadmap_discovery():
    with TestClient(app) as client:
        print("\n--- 1. Testing Food Processing Unit Approval Discovery ---")
        food_payload = {
            "enterprise_name": "Satpura Organic Foods Pvt Ltd",
            "business_type": "Food Processing Unit",
            "state": "Maharashtra",
            "investment_inr": 7500000.0,  # ₹75 Lakhs
            "employee_count": 25,
        }

        # Step 1: Create business
        post_res = client.post("/api/v1/business/profile", json=food_payload)
        assert post_res.status_code == 201, f"Failed to create business: {post_res.text}"
        food_biz = post_res.json()
        biz_id = food_biz["id"]
        print(f" Created Food Business ID: {biz_id}")

        # Step 2: Discover approvals
        discover_res = client.post(f"/api/v1/business/{biz_id}/discover-approvals")
        assert discover_res.status_code == 200, f"Discovery failed: {discover_res.text}"
        roadmap = discover_res.json()

        print(f" Enterprise: {roadmap['enterprise_name']}")
        print(f" MSME Category: {roadmap['summary']['msme_category']}")
        print(f" Total Approvals Required: {roadmap['summary']['total_approvals']}")
        print(f" Estimated Max Duration: {roadmap['summary']['estimated_total_days']} Days")

        codes = [a["code"] for a in roadmap["approvals"]]
        print(f" Mapped Approvals: {codes}")

        # Verify standard approvals for Food Processing
        assert "BIZ_REG" in codes, "BIZ_REG missing"
        assert "FSSAI_LICENCE" in codes, "FSSAI_LICENCE missing"
        assert "PCB_CTE" in codes, "PCB_CTE missing"
        assert "FIRE_NOC" in codes, "FIRE_NOC missing"
        assert "FACTORY_LICENCE" in codes, "FACTORY_LICENCE missing"
        assert "TRADE_LICENCE" in codes, "TRADE_LICENCE missing"
        print(" Food Processing regulatory mapping validated successfully!")

        # Step 3: Get Roadmap GET endpoint
        get_res = client.get(f"/api/v1/business/{biz_id}/roadmap")
        assert get_res.status_code == 200
        roadmap_get = get_res.json()
        assert len(roadmap_get["approvals"]) == len(roadmap["approvals"])
        print(" GET /roadmap endpoint validated successfully!")

        # Step 4: Status update PATCH endpoint
        first_approval = roadmap["approvals"][0]
        app_id = first_approval["id"]
        patch_res = client.patch(
            f"/api/v1/business/{biz_id}/approvals/{app_id}/status",
            json={"status": "documents_ready"},
        )
        assert patch_res.status_code == 200
        patch_data = patch_res.json()
        assert patch_data["status"] == "documents_ready"
        print(f" Updated status of approval '{first_approval['code']}' to 'documents_ready'")


def test_software_it_discovery():
    with TestClient(app) as client:
        print("\n--- 2. Testing Software/IT Approval Discovery ---")
        it_payload = {
            "enterprise_name": "DevKiran Cloud Systems LLP",
            "business_type": "Software/IT",
            "state": "Karnataka",
            "investment_inr": 2000000.0,  # ₹20 Lakhs
            "employee_count": 12,
        }

        post_res = client.post("/api/v1/business/profile", json=it_payload)
        assert post_res.status_code == 201
        it_biz = post_res.json()
        biz_id = it_biz["id"]

        discover_res = client.post(f"/api/v1/business/{biz_id}/discover-approvals")
        assert discover_res.status_code == 200
        roadmap = discover_res.json()
        codes = [a["code"] for a in roadmap["approvals"]]
        print(f" IT Mapped Approvals: {codes}")

        assert "BIZ_REG" in codes
        assert "SHOPS_EST" in codes
        assert "FSSAI_LICENCE" not in codes
        print(" Software/IT regulatory mapping validated successfully!")


if __name__ == "__main__":
    test_roadmap_discovery()
    test_software_it_discovery()
    print("\n All Roadmap & Regulatory Discovery tests passed successfully!")
