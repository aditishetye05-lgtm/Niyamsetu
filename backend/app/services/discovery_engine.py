from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.business import Business
from app.models.approval import MasterApproval, BusinessApproval


def classify_msme(investment_inr: float) -> str:
    if investment_inr <= 10000000:  # <= 1 Cr
        return "Micro Enterprise"
    elif investment_inr <= 100000000:  # <= 10 Cr
        return "Small Enterprise"
    elif investment_inr <= 500000000:  # <= 50 Cr
        return "Medium Enterprise"
    return "Large Enterprise"


def determine_required_approval_codes(business: Business) -> List[str]:
    """
    Evaluates business parameters (type, investment, employee count, state)
    and determines the required approval codes in priority/logical order.
    """
    b_type = (business.business_type or "").lower()
    codes: List[str] = ["BIZ_REG", "GST_REG"]

    # MSME qualification
    if business.investment_inr <= 500000000:
        codes.append("MSME_UDYAM")

    # Local trade licence for physical locations
    codes.append("TRADE_LICENCE")

    # Food Processing Unit
    if "food" in b_type:
        codes.extend(["FSSAI_LICENCE", "PCB_CTE", "FIRE_NOC"])
        if business.employee_count >= 10 or business.investment_inr >= 2500000:
            codes.append("FACTORY_LICENCE")

    # Chemical Manufacturing / Heavy Manufacturing
    elif "chemical" in b_type or "manufacturing" in b_type:
        codes.extend(["PCB_CTE", "FIRE_NOC", "FACTORY_LICENCE"])
        if "chemical" in b_type or business.investment_inr >= 50000000:
            codes.append("BOILER_REG")

    # Software / IT & Services
    elif "software" in b_type or "it" in b_type or "service" in b_type:
        codes.append("SHOPS_EST")
        if business.employee_count >= 50:
            codes.append("FIRE_NOC")

    # General Retail & Trade
    elif "retail" in b_type or "trade" in b_type:
        codes.append("SHOPS_EST")
        if "food" in b_type or "grocery" in b_type:
            codes.append("FSSAI_LICENCE")
        if business.employee_count >= 20:
            codes.append("FIRE_NOC")

    # Pharmaceuticals & Healthcare
    elif "pharm" in b_type or "health" in b_type:
        codes.extend(["PCB_CTE", "FIRE_NOC", "FACTORY_LICENCE", "SHOPS_EST"])

    # Renewable Energy / Other
    else:
        codes.extend(["PCB_CTE", "FIRE_NOC"])
        if business.employee_count >= 10:
            codes.append("FACTORY_LICENCE")
        else:
            codes.append("SHOPS_EST")

    # Deduplicate while preserving order
    seen = set()
    ordered_codes = []
    for c in codes:
        if c not in seen:
            seen.add(c)
            ordered_codes.append(c)

    return ordered_codes


def evaluate_and_generate_approvals(
    business: Business, db: Session
) -> Tuple[List[BusinessApproval], bool]:
    """
    Populates `business_approvals` for the business if not already populated.
    Returns (list of BusinessApproval records, was_newly_generated).
    """
    existing_approvals = (
        db.query(BusinessApproval)
        .filter(BusinessApproval.business_id == business.id)
        .all()
    )

    if existing_approvals:
        return existing_approvals, False

    required_codes = determine_required_approval_codes(business)

    # Fetch master approval records matching the required codes
    masters = (
        db.query(MasterApproval)
        .filter(MasterApproval.code.in_(required_codes))
        .all()
    )
    master_map = {m.code: m for m in masters}

    new_approvals: List[BusinessApproval] = []
    for code in required_codes:
        master = master_map.get(code)
        if master:
            ba = BusinessApproval(
                business_id=business.id,
                approval_id=master.id,
                status="not_applied",
                is_mandatory=True,
            )
            db.add(ba)
            new_approvals.append(ba)

    db.commit()
    for ba in new_approvals:
        db.refresh(ba)

    return new_approvals, True
