from fastapi.testclient import TestClient
from app.main import app


def test_tracker_and_alerts():
    with TestClient(app) as client:
        print("\n--- 1. Testing Step 5: Statutory Portal Readiness Check ---")
        biz_payload = {
            "enterprise_name": "Sahyadri Spices & Agro Ltd",
            "business_type": "Food Processing Unit",
            "state": "Maharashtra",
            "investment_inr": 6500000.0,
            "employee_count": 20,
        }

        post_res = client.post("/api/v1/business/profile", json=biz_payload)
        assert post_res.status_code == 201
        biz_id = post_res.json()["id"]

        # Discover approvals
        roadmap_res = client.post(f"/api/v1/business/{biz_id}/discover-approvals")
        assert roadmap_res.status_code == 200
        roadmap = roadmap_res.json()
        fssai_app = next(a for a in roadmap["approvals"] if a["code"] == "FSSAI_LICENCE")

        # Call portal-check
        check_res = client.get(f"/api/v1/business/{biz_id}/portal-check/{fssai_app['id']}")
        assert check_res.status_code == 200, f"Portal check failed: {check_res.text}"
        check_data = check_res.json()

        print(f" Clearance: {check_data['approval_name']}")
        print(f" Official Portal: {check_data['official_portal_url']}")
        print(f" Ready to Proceed: {check_data['is_ready_to_proceed']}")
        print(f" Disclaimer: {check_data['statutory_disclaimer'][:60]}...")
        assert "statutory" in check_data["statutory_disclaimer"].lower()
        assert len(check_data["official_portal_url"]) > 0

        print("\n--- 2. Testing Step 6: Application Status Tracker & 5-Stage Progression ---")
        track_payload = {
            "application_id": "MH2026-FSSAI-8921",
            "tracking_stage": "department_inspection",
            "notes": "Inspector scheduled field verification on site for next Tuesday.",
        }

        track_res = client.post(
            f"/api/v1/business/{biz_id}/approvals/{fssai_app['id']}/track",
            json=track_payload,
        )
        assert track_res.status_code == 200, f"Tracking update failed: {track_res.text}"
        tracked_item = track_res.json()

        print(f" Tracked App ID: {tracked_item['application_id']}")
        print(f" Tracking Stage: {tracked_item['tracking_stage']}")
        assert tracked_item["application_id"] == "MH2026-FSSAI-8921"
        assert tracked_item["tracking_stage"] == "department_inspection"

        # Fetch full tracking overview
        overview_res = client.get(f"/api/v1/business/{biz_id}/tracking")
        assert overview_res.status_code == 200
        overview = overview_res.json()

        print(f" Total Tracked: {overview['total_tracked']}")
        print(f" Stage Counts: {overview['stage_counts']}")
        assert overview["stage_counts"]["department_inspection"] >= 1

        print("\n--- 3. Testing Step 7: Reminders & Notification Alerts ---")
        alerts_res = client.get(f"/api/v1/business/{biz_id}/alerts")
        assert alerts_res.status_code == 200
        alerts_summary = alerts_res.json()

        print(f" Total Unread: {alerts_summary['total_unread']}")
        print(f" Upcoming Renewals: {alerts_summary['upcoming_renewals_count']}")
        print(f" Pending Actions: {alerts_summary['pending_actions_count']}")
        print(f" Status Updates: {alerts_summary['status_updates_count']}")

        assert alerts_summary["total_unread"] >= 3
        first_alert = alerts_summary["alerts"][0]

        # Mark first alert as read
        read_res = client.patch(f"/api/v1/business/{biz_id}/alerts/{first_alert['id']}/read")
        assert read_res.status_code == 200

        # Verify unread count decreased
        alerts_res2 = client.get(f"/api/v1/business/{biz_id}/alerts")
        assert alerts_res2.status_code == 200
        assert alerts_res2.json()["total_unread"] == alerts_summary["total_unread"] - 1
        print(" Successfully marked alert as read and verified unread count!")


if __name__ == "__main__":
    test_tracker_and_alerts()
    print("\n[SUCCESS] All Feature 5 Tracker, Portal Check & Alerts tests passed successfully!")
