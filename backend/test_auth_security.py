"""
NiyamSetu Automated Security & Authentication Test Suite
Tests:
1. User registration (signup) and duplicate prevention.
2. User authentication (login) with bcrypt and JWT verification.
3. Protected user profile (/me) route validation.
4. Multi-tenant access isolation (cross-tenant access rejected with 403).
5. Document vault upload security (magic byte verification & size limits).
6. Transactional email dispatch service (application status updates and renewal warnings).
"""

import sys
import os
import uuid
import io

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from app.main import app
from app.services.email_service import (
    dispatch_status_change_email,
    dispatch_renewal_warning_email,
)

client = TestClient(app)


def test_auth_workflow():
    print("\n--- [1] Testing Auth: Signup, Login, and /me ---")
    random_suffix = uuid.uuid4().hex[:8]
    test_email = f"director_{random_suffix}@enterprise.in"
    test_password = "SecurePassword123!"
    full_name = "Vikramaditya Sharma"

    # 1. Signup
    signup_payload = {
        "email": test_email,
        "password": test_password,
        "full_name": full_name,
    }
    signup_res = client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_res.status_code == 201, f"Signup failed: {signup_res.text}"
    signup_data = signup_res.json()
    assert "access_token" in signup_data, "access_token missing in signup response"
    assert signup_data["user"]["email"] == test_email
    assert signup_data["user"]["full_name"] == full_name
    print(" [PASS] User Signup successful with JWT token returned.")

    # 2. Duplicate Signup Prevention
    dup_res = client.post("/api/v1/auth/signup", json=signup_payload)
    assert dup_res.status_code == 400, "Duplicate email registration was not blocked"
    print(" [PASS] Duplicate email registration blocked with 400.")

    # 3. Login
    login_payload = {
        "email": test_email,
        "password": test_password,
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    print(" [PASS] User Login successful with bcrypt validation.")

    # 4. Invalid Password Check
    bad_login = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": "WrongPassword999"},
    )
    assert bad_login.status_code == 401, "Invalid password login should return 401"
    print(" [PASS] Invalid password rejected with 401.")

    # 5. Access /auth/me with valid Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200, f"/me failed: {me_res.text}"
    assert me_res.json()["email"] == test_email
    print(" [PASS] /auth/me authenticated successfully with Bearer token.")

    # 6. Access /auth/me without token -> 401
    me_unauth = client.get("/api/v1/auth/me")
    assert me_unauth.status_code == 401, "Unauthenticated /me should return 401"
    print(" [PASS] Unauthenticated access to /auth/me rejected with 401.")

    return token, test_email


def test_multitenancy_isolation(token_user_a: str):
    print("\n--- [2] Testing Multi-Tenant Access Isolation ---")
    headers_a = {"Authorization": f"Bearer {token_user_a}"}

    # Register user B
    suffix_b = uuid.uuid4().hex[:8]
    email_b = f"intruder_{suffix_b}@competitor.in"
    res_b = client.post(
        "/api/v1/auth/signup",
        json={"email": email_b, "password": "Password456!", "full_name": "Rival Tenant"},
    )
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a business profile
    biz_payload = {
        "enterprise_name": "Sharma Agro Tech Ltd",
        "business_type": "Food Processing Unit",
        "state": "Maharashtra",
        "investment_inr": 8500000,
        "employee_count": 35,
    }
    biz_res = client.post("/api/v1/business/profile", json=biz_payload, headers=headers_a)
    assert biz_res.status_code == 201, f"Business creation failed: {biz_res.text}"
    business_id = biz_res.json()["id"]
    print(f" [PASS] Business '{biz_payload['enterprise_name']}' created and linked to User A (id: {business_id}).")

    # User A accesses their own business documents -> 200 OK
    doc_res_a = client.get(f"/api/v1/business/{business_id}/documents", headers=headers_a)
    assert doc_res_a.status_code == 200, f"User A could not access their own documents: {doc_res_a.text}"
    print(" [PASS] User A allowed to inspect their own vault documents (200 OK).")

    # User B attempts to access User A's business documents -> 403 Forbidden
    doc_res_b = client.get(f"/api/v1/business/{business_id}/documents", headers=headers_b)
    assert doc_res_b.status_code == 403, f"Cross-tenant access was not rejected with 403: {doc_res_b.status_code}"
    print(" [PASS] User B (rival tenant) blocked from accessing User A's documents (403 Forbidden).")

    return business_id, headers_a, headers_b


def test_document_vault_security(business_id: str, headers_a: dict):
    print("\n--- [3] Testing Document Vault Security & Magic Byte Validation ---")
    
    # Get master documents to find a valid master_document_id
    docs_res = client.get(f"/api/v1/business/{business_id}/documents", headers=headers_a)
    assert docs_res.status_code == 200
    docs_data = docs_res.json()
    assert len(docs_data["unique_vault_checklist"]) > 0
    master_doc_id = docs_data["unique_vault_checklist"][0]["master_document_id"]

    # 1. Upload malicious/fake file (magic bytes check)
    fake_exe_content = b"MZ\x90\x00ThisIsAnExecutableFileSimulatingMalware"
    bad_upload = client.post(
        f"/api/v1/business/{business_id}/documents/upload",
        data={"master_document_id": master_doc_id},
        files={"file": ("malware.pdf", io.BytesIO(fake_exe_content), "application/pdf")},
        headers=headers_a,
    )
    assert bad_upload.status_code == 400, "Malicious file without valid magic bytes should be rejected with 400"
    assert "magic bytes" in bad_upload.json()["detail"].lower()
    print(" [PASS] File with forged MIME and invalid magic bytes rejected with 400.")

    # 2. Upload oversized file (> 5MB)
    huge_content = b"%PDF" + b"0" * (6 * 1024 * 1024)
    huge_upload = client.post(
        f"/api/v1/business/{business_id}/documents/upload",
        data={"master_document_id": master_doc_id},
        files={"file": ("huge.pdf", io.BytesIO(huge_content), "application/pdf")},
        headers=headers_a,
    )
    assert huge_upload.status_code == 400, "Oversized file (>5MB) should be rejected with 400"
    assert "5mb" in huge_upload.json()["detail"].lower()
    print(" [PASS] Oversized file (>5MB) rejected with 400.")

    # 3. Upload authentic PDF with valid %PDF magic bytes
    valid_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Title (FSSAI Certificate) >>\nendobj\ntrailer\n<<>>\n%%EOF"
    good_upload = client.post(
        f"/api/v1/business/{business_id}/documents/upload",
        data={"master_document_id": master_doc_id},
        files={"file": ("Company_PAN_Proof.pdf", io.BytesIO(valid_pdf_content), "application/pdf")},
        headers=headers_a,
    )
    assert good_upload.status_code == 201, f"Valid PDF upload failed: {good_upload.text}"
    vault_doc = good_upload.json()
    assert vault_doc["file_name"] == "Company_PAN_Proof.pdf"
    assert "sec_" in vault_doc["file_url"], "Disk URL must be obfuscated with UUID prefix"
    print(" [PASS] Valid PDF uploaded successfully with UUID-obfuscated storage path.")


def test_email_service(business_id: str, headers_a: dict):
    print("\n--- [4] Testing Email Notification Delivery Service ---")
    
    # 1. Direct dispatch of status change email
    success_status = dispatch_status_change_email(
        to_email="director@enterprise.in",
        enterprise_name="Sharma Agro Tech Ltd",
        clearance_name="Food Safety Licence (FSSAI)",
        new_stage="approved",
        application_id="MH2026-FSSAI-9021",
    )
    assert success_status is True, "Status change email dispatch failed"
    print(" [PASS] Transactional status change email generated & dispatched.")

    # 2. Direct dispatch of renewal expiry warning email
    success_renewal = dispatch_renewal_warning_email(
        to_email="director@enterprise.in",
        enterprise_name="Sharma Agro Tech Ltd",
        clearance_name="Fire Safety NOC Renewal",
        days_remaining=30,
        due_date="15 Nov 2026",
    )
    assert success_renewal is True, "Renewal warning email dispatch failed"
    print(" [PASS] Transactional renewal warning email generated & dispatched.")

    # 3. Test alert email endpoint
    alerts_res = client.get(f"/api/v1/business/{business_id}/alerts")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()["alerts"]
    if len(alerts) > 0:
        alert_id = alerts[0]["id"]
        send_res = client.post(
            f"/api/v1/business/{business_id}/alerts/{alert_id}/dispatch-email",
            headers=headers_a,
        )
        assert send_res.status_code == 200, f"Alert email endpoint failed: {send_res.text}"
        print(f" [PASS] Alert email endpoint dispatched notification for '{alerts[0]['title']}'.")


def run_all_tests():
    print("=================================================================")
    print("  NiyamSetu Enhancement Suite: Security, Auth & Email Tests      ")
    print("=================================================================")
    token_a, email_a = test_auth_workflow()
    business_id, headers_a, headers_b = test_multitenancy_isolation(token_a)
    test_document_vault_security(business_id, headers_a)
    test_email_service(business_id, headers_a)
    print("\n=================================================================")
    print("  ALL AUTH, PRIVACY, SECURITY & EMAIL TESTS PASSED SUCCESSFULLY! ")
    print("=================================================================\n")


if __name__ == "__main__":
    run_all_tests()
