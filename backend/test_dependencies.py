from fastapi.testclient import TestClient
from app.main import app


def test_dependency_map_dag():
    with TestClient(app) as client:
        print("\n--- 1. Testing Initial DAG Dependency Resolution ---")
        biz_payload = {
            "enterprise_name": "Godavari Food Processors Pvt Ltd",
            "business_type": "Food Processing Unit",
            "state": "Maharashtra",
            "investment_inr": 6000000.0,
            "employee_count": 18,
        }

        # Step 1: Create business & generate roadmap
        post_res = client.post("/api/v1/business/profile", json=biz_payload)
        assert post_res.status_code == 201
        biz_id = post_res.json()["id"]

        # Step 2: Fetch initial dependency map
        dag_res = client.get(f"/api/v1/business/{biz_id}/dependency-map")
        assert dag_res.status_code == 200, f"DAG fetch failed: {dag_res.text}"
        dag_data = dag_res.json()

        print(f" Enterprise: {dag_data['enterprise_name']}")
        print(f" Total Nodes: {len(dag_data['nodes'])}")
        print(f" Total Edges: {len(dag_data['edges'])}")
        print(f" Summary: {dag_data['summary']}")

        node_map = {n["code"]: n for n in dag_data["nodes"]}

        # BIZ_REG and FIRE_NOC should be CAN_APPLY_NOW
        assert node_map["BIZ_REG"]["execution_state"] == "CAN_APPLY_NOW", "BIZ_REG should be CAN_APPLY_NOW"
        assert node_map["BIZ_REG"]["can_apply"] is True
        print(" BIZ_REG verified as CAN_APPLY_NOW (Independent)")

        assert node_map["FIRE_NOC"]["execution_state"] == "CAN_APPLY_NOW", "FIRE_NOC should be CAN_APPLY_NOW"
        assert node_map["FIRE_NOC"]["can_apply"] is True
        print(" FIRE_NOC verified as CAN_APPLY_NOW (Independent)")

        # FSSAI_LICENCE and PCB_CTE should be BLOCKED because BIZ_REG is not yet approved
        assert node_map["FSSAI_LICENCE"]["execution_state"] == "BLOCKED"
        assert len(node_map["FSSAI_LICENCE"]["blocking_reasons"]) > 0
        print(f" FSSAI_LICENCE is BLOCKED: {node_map['FSSAI_LICENCE']['blocking_reasons']}")

        assert node_map["PCB_CTE"]["execution_state"] == "BLOCKED"
        print(" FSSAI_LICENCE and PCB_CTE correctly identified as BLOCKED")

        # Step 3: Approve BIZ_REG
        print("\n--- 2. Simulating Statutory Approval of 'BIZ_REG' ---")
        biz_reg_id = node_map["BIZ_REG"]["id"]
        patch_res = client.patch(
            f"/api/v1/business/{biz_id}/approvals/{biz_reg_id}/status",
            json={"status": "approved"},
        )
        assert patch_res.status_code == 200

        # Step 4: Re-evaluate DAG
        dag_res2 = client.get(f"/api/v1/business/{biz_id}/dependency-map")
        assert dag_res2.status_code == 200
        dag_data2 = dag_res2.json()
        node_map2 = {n["code"]: n for n in dag_data2["nodes"]}

        # BIZ_REG should now be COMPLETED
        assert node_map2["BIZ_REG"]["execution_state"] == "COMPLETED"
        print(" BIZ_REG state updated to COMPLETED")

        # FSSAI_LICENCE and PCB_CTE should now be unblocked (CAN_APPLY_NOW)!
        assert node_map2["FSSAI_LICENCE"]["execution_state"] == "CAN_APPLY_NOW", "FSSAI should now be CAN_APPLY_NOW"
        assert node_map2["FSSAI_LICENCE"]["can_apply"] is True
        print(" FSSAI_LICENCE dynamically unblocked -> CAN_APPLY_NOW!")

        assert node_map2["PCB_CTE"]["execution_state"] == "CAN_APPLY_NOW"
        assert node_map2["PCB_CTE"]["can_apply"] is True
        print(" PCB_CTE dynamically unblocked -> CAN_APPLY_NOW!")

        # FACTORY_LICENCE should still be BLOCKED (needs PCB_CTE and FIRE_NOC approved)
        assert node_map2["FACTORY_LICENCE"]["execution_state"] == "BLOCKED"
        print(" Multi-parent dependency resolution verified: FACTORY_LICENCE remains BLOCKED until CTE and Fire NOC are approved")

        # Verify edge satisfaction
        sat_edges = [e for e in dag_data2["edges"] if e["is_satisfied"]]
        print(f" Satisfied prerequisite edges: {len(sat_edges)}")
        assert len(sat_edges) > 0


if __name__ == "__main__":
    test_dependency_map_dag()
    print("\n All Feature 4 DAG & Dependency Resolution tests passed successfully!")
