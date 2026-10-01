from fastapi.testclient import TestClient
from app.main import app


def test_vault_and_compliance_score():
    with TestClient(app) as client:
        print("\n--- 1. Testing Document Requirements & Cross-Approval Reuse ---")
        biz_payload = {
            "enterprise_name": "Kavveri Organic Juices Ltd",
            "business_type": "Food Processing Unit",
            "state": "Maharashtra",
            "investment_inr": 8000000.0,
            "employee_count": 22,
        }

        # Create business & generate roadmap
        post_res = client.post("/api/v1/business/profile", json=biz_payload)
        assert post_res.status_code == 201
        biz = post_res.json()
        biz_id = biz["id"]

        # Call GET /documents
        doc_res = client.get(f"/api/v1/business/{biz_id}/documents")
        assert doc_res.status_code == 200, f"Failed: {doc_res.text}"
        doc_data = doc_res.json()

        print(f" Enterprise: {doc_data['enterprise_name']}")
        print(f" Total Unique Documents Required: {doc_data['total_required_unique']}")
        print(f" Initial Uploaded Documents: {doc_data['total_uploaded_unique']}")
        print(f" Initial Document Readiness: {doc_data['document_readiness_pct']}%")

        assert doc_data["total_required_unique"] > 0
        assert doc_data["document_readiness_pct"] == 0.0

        # Check cross-approval reuse in checklist
        checklist = doc_data["unique_vault_checklist"]
        pan_doc = next((d for d in checklist if d["code"] == "DOC_PAN"), None)
        assert pan_doc is not None, "DOC_PAN should be in checklist"
        print(f" Document '{pan_doc['name']}' is reused in {len(pan_doc['reused_in_approvals'])} approvals: {pan_doc['reused_in_approvals']}")
        assert len(pan_doc["reused_in_approvals"]) >= 2, "DOC_PAN should be reused across multiple approvals!"

        rent_doc = next((d for d in checklist if d["code"] == "DOC_RENT_AGREEMENT"), None)
        assert rent_doc is not None
        print(f" Document '{rent_doc['name']}' is reused in {len(rent_doc['reused_in_approvals'])} approvals")
        assert len(rent_doc["reused_in_approvals"]) >= 2

        print(" Initial Compliance Readiness Score ---")
        score_res = client.get(f"/api/v1/business/{biz_id}/compliance-score")
        assert score_res.status_code == 200
        score_data = score_res.json()

        print(f" Initial Overall Score: {score_data['overall_score']}% ({score_data['rating_label']})")
        print(f" Breakdown: {score_data['breakdown']}")
        initial_score = score_data["overall_score"]

        # Upload DOC_PAN into vault
        print("\n--- 2. Uploading 'DOC_PAN' into Vault ---")
        upload_res = client.post(
            f"/api/v1/business/{biz_id}/documents/upload",
            data={
                "master_document_id": pan_doc["master_document_id"],
                "file_name": "Company_PAN_Card.pdf",
            },
        )
        assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
        vault_entry = upload_res.json()
        print(f" Uploaded Vault Document ID: {vault_entry['id']}, File: {vault_entry['file_name']}")

        # Upload DOC_RENT_AGREEMENT into vault
        print("--- 3. Uploading 'DOC_RENT_AGREEMENT' into Vault ---")
        upload_res2 = client.post(
            f"/api/v1/business/{biz_id}/documents/upload",
            data={
                "master_document_id": rent_doc["master_document_id"],
                "file_name": "Registered_Lease_Deed.pdf",
            },
        )
        assert upload_res2.status_code == 201
        vault_entry2 = upload_res2.json()

        # Check that documents are now reflected as uploaded across ALL approvals requiring them
        print("\n--- 4. Verifying Cross-Approval Reuse After Upload ---")
        doc_res2 = client.get(f"/api/v1/business/{biz_id}/documents")
        assert doc_res2.status_code == 200
        doc_data2 = doc_res2.json()

        print(f" Updated Uploaded Count: {doc_data2['total_uploaded_unique']} of {doc_data2['total_required_unique']}")
        print(f" Updated Document Readiness: {doc_data2['document_readiness_pct']}%")
        assert doc_data2["total_uploaded_unique"] == 2
        assert doc_data2["document_readiness_pct"] > 0.0

        # Check each approval group to ensure DOC_PAN is marked is_uploaded=True everywhere it appears
        for app_group in doc_data2["approvals"]:
            for d in app_group["documents"]:
                if d["code"] in ("DOC_PAN", "DOC_RENT_AGREEMENT"):
                    assert d["is_uploaded"] is True, f"Document {d['code']} should be marked uploaded in approval {app_group['approval_code']}"

        print(" Cross-approval document reuse verified across all relevant approvals!")

        # Check Compliance Score has dynamically updated
        print("\n--- 5. Checking Updated Dynamic Compliance Score ---")
        score_res2 = client.get(f"/api/v1/business/{biz_id}/compliance-score")
        assert score_res2.status_code == 200
        score_data2 = score_res2.json()
        print(f" Updated Score: {score_data2['overall_score']}% ({score_data2['rating_label']})")
        print(f" Updated Breakdown: {score_data2['breakdown']}")
        assert score_data2["overall_score"] > initial_score, "Overall score should increase after uploading mandatory documents!"

        # Test Deletion
        del_res = client.delete(f"/api/v1/business/{biz_id}/documents/{vault_entry['id']}")
        assert del_res.status_code == 200
        print(" Successfully tested vault document deletion.")


if __name__ == "__main__":
    test_vault_and_compliance_score()
    print("\n All Feature 3 Vault & Compliance Score tests passed successfully!")
