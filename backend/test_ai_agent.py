import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.services.ai_context import build_business_ai_context


def test_ai_guidance_agent():
    print("[1/6] Launching TestClient...", flush=True)
    with TestClient(app) as client:
        print("\n--- 1. Setting up Enterprise Profile for AI Guidance Agent ---", flush=True)
        biz_payload = {
            "enterprise_name": "Konkan Agro & Organic Foods LLP",
            "business_type": "Food Processing Unit",
            "state": "Maharashtra",
            "investment_inr": 8500000.0,
            "employee_count": 24,
        }

        res = client.post("/api/v1/business/profile", json=biz_payload)
        assert res.status_code == 201
        biz_id = res.json()["id"]

        # Discover approvals
        disc_res = client.post(f"/api/v1/business/{biz_id}/discover-approvals")
        assert disc_res.status_code == 200

        print("\n--- 2. Testing AI Context Compilation ---")
        db = SessionLocal()
        try:
            ctx = build_business_ai_context(biz_id, db)
            assert ctx["enterprise_name"] == "Konkan Agro & Organic Foods LLP"
            assert ctx["business_type"] == "Food Processing Unit"
            assert ctx["state"] == "Maharashtra"
            assert len(ctx["approvals"]) > 0
            assert len(ctx["missing_documents"]) > 0
            assert "compliance_score" in ctx
            print(f" Context compiled: {ctx['total_clearances']} clearances, Score: {ctx['compliance_score']}%")
            print(f" Missing Documents: {len(ctx['missing_documents'])} items")
            print(f" Immediate Unblocked Clearances: {len(ctx['can_apply_now'])} items")
        finally:
            db.close()

        print("\n--- 3. Testing Contextual Suggestions Endpoint ---")
        sug_res = client.get(f"/api/v1/business/{biz_id}/agent/suggestions")
        assert sug_res.status_code == 200
        suggestions = sug_res.json()["suggestions"]
        assert len(suggestions) > 0
        print(f" Received {len(suggestions)} dynamic suggestions:")
        for s in suggestions:
            print(f"   - {s}")

        print("\n--- 4. Testing AI Chat Endpoint: FSSAI Query ---")
        chat_res1 = client.post(
            f"/api/v1/business/{biz_id}/agent/chat",
            json={"message": "Why do I need a Food Safety Licence and what are the required documents?"},
        )
        assert chat_res1.status_code == 200
        data1 = chat_res1.json()
        assert len(data1["reply"]) > 50
        assert len(data1["suggested_actions"]) > 0
        print(" FSSAI Query Answered:")
        print(f"   Engine: {data1['engine']}")
        print(f"   Reply snippet: {data1['reply'][:120]}...")
        print(f"   Actions: {data1['suggested_actions']}")

        print("\n--- 5. Testing AI Chat Endpoint: Blocked Clearances Query ---")
        chat_res2 = client.post(
            f"/api/v1/business/{biz_id}/agent/chat",
            json={"message": "Why is my Factory Licence currently blocked in the dependency map?"},
        )
        assert chat_res2.status_code == 200
        data2 = chat_res2.json()
        assert len(data2["reply"]) > 50
        assert "blocked" in data2["reply"].lower() or "prerequisite" in data2["reply"].lower() or "consent" in data2["reply"].lower()
        print(" Blocked Query Answered:")
        print(f"   Reply snippet: {data2['reply'][:120]}...")

        print("\n--- 6. Testing AI Chat Endpoint: Compliance Score Query ---")
        chat_res3 = client.post(
            f"/api/v1/business/{biz_id}/agent/chat",
            json={"message": "How is my compliance score calculated and how do I improve it?"},
        )
        assert chat_res3.status_code == 200
        data3 = chat_res3.json()
        assert "formula" in data3["reply"].lower() or "readiness" in data3["reply"].lower() or "%" in data3["reply"]
        print(" Score Query Answered:")
        print(f"   Reply snippet: {data3['reply'][:120]}...")


if __name__ == "__main__":
    test_ai_guidance_agent()
    print("\n[SUCCESS] All Feature 6 AI Guidance Agent tests passed successfully!")
