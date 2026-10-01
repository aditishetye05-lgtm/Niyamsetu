from sqlalchemy.orm import Session
from app.models.approval import MasterApproval

MASTER_APPROVALS_DATA = [
    {
        "code": "BIZ_REG",
        "name": "Business Entity Registration (MCA / SPICe+)",
        "department": "Ministry of Corporate Affairs (MCA)",
        "description": "Incorporation certificate (Pvt Ltd, LLP, or OPC) including PAN, TAN, and DIN allocation under Companies Act 2013.",
        "official_portal_url": "https://www.mca.gov.in",
        "processing_days": 10,
        "prerequisites": "",
    },
    {
        "code": "GST_REG",
        "name": "Goods & Services Tax (GST) Registration",
        "department": "Department of Revenue / GSTN",
        "description": "Mandatory for interstate business transactions, turnover exceeding threshold, or e-commerce/procurement.",
        "official_portal_url": "https://www.gst.gov.in",
        "processing_days": 7,
        "prerequisites": "BIZ_REG",
    },
    {
        "code": "MSME_UDYAM",
        "name": "Udyam MSME Registration",
        "department": "Ministry of Micro, Small and Medium Enterprises",
        "description": "Enables priority sector lending, capital subsidies, patent discounts, and protection against delayed payments.",
        "official_portal_url": "https://udyamregistration.gov.in",
        "processing_days": 3,
        "prerequisites": "BIZ_REG,GST_REG",
    },
    {
        "code": "TRADE_LICENCE",
        "name": "Local Municipal Trade Licence",
        "department": "Municipal Corporation / Urban Local Body",
        "description": "Authorizes commercial operations within municipal limits ensuring public health, safety, and zonal regulations.",
        "official_portal_url": "https://serviceonline.gov.in",
        "processing_days": 15,
        "prerequisites": "BIZ_REG",
    },
    {
        "code": "FIRE_NOC",
        "name": "Fire Safety NOC (No Objection Certificate)",
        "department": "State Fire and Emergency Services",
        "description": "Certifies industrial/commercial premises adhere to National Building Code (NBC) fire prevention and evacuation safety norms.",
        "official_portal_url": "https://nsws.gov.in",
        "processing_days": 21,
        "prerequisites": "BIZ_REG",
    },
    {
        "code": "PCB_CTE",
        "name": "Pollution Consent to Establish (CTE)",
        "department": "State Pollution Control Board (SPCB / CPCB)",
        "description": "Statutory permission under Water (Prevention and Control of Pollution) Act 1974 & Air Act 1981 before starting construction/installation.",
        "official_portal_url": "https://ocmms.nic.in",
        "processing_days": 45,
        "prerequisites": "BIZ_REG,TRADE_LICENCE",
    },
    {
        "code": "FACTORY_LICENCE",
        "name": "Factory Licence & Plan Approval",
        "department": "Directorate of Industrial Safety & Health (DISH)",
        "description": "Statutory licence under Factories Act 1948 for units utilizing power with 10+ workers (or 20+ without power) for worker health & safety.",
        "official_portal_url": "https://labour.gov.in",
        "processing_days": 30,
        "prerequisites": "BIZ_REG,FIRE_NOC,PCB_CTE",
    },
    {
        "code": "FSSAI_LICENCE",
        "name": "Food Safety Licence (State / Central FSSAI)",
        "department": "Food Safety and Standards Authority of India (FSSAI)",
        "description": "Mandatory licence under FSS Act 2006 for manufacturing, processing, packaging, storage, or distribution of food products.",
        "official_portal_url": "https://foscos.fssai.gov.in",
        "processing_days": 30,
        "prerequisites": "BIZ_REG,TRADE_LICENCE",
    },
    {
        "code": "SHOPS_EST",
        "name": "Shops & Commercial Establishment Registration",
        "department": "State Labour Department",
        "description": "Mandatory for commercial offices, software parks, and IT/service providers governing working hours, holidays, and employee benefits.",
        "official_portal_url": "https://shramsuvidha.gov.in",
        "processing_days": 10,
        "prerequisites": "BIZ_REG",
    },
    {
        "code": "BOILER_REG",
        "name": "Boiler & Pressure Vessel Registration",
        "department": "Directorate of Steam Boilers / PESO",
        "description": "Inspection and certification under Indian Boilers Act for chemical reactors, steam generation, and hazardous pressure equipment.",
        "official_portal_url": "https://peso.gov.in",
        "processing_days": 30,
        "prerequisites": "FACTORY_LICENCE",
    },
]


def seed_master_approvals(db: Session) -> int:
    """
    Idempotently seeds master regulatory approvals if not already present.
    Returns count of newly seeded approvals.
    """
    added_count = 0
    for data in MASTER_APPROVALS_DATA:
        existing = (
            db.query(MasterApproval).filter(MasterApproval.code == data["code"]).first()
        )
        if not existing:
            approval = MasterApproval(**data)
            db.add(approval)
            added_count += 1
        else:
            # Update fields if needed
            existing.name = data["name"]
            existing.department = data["department"]
            existing.description = data["description"]
            existing.official_portal_url = data["official_portal_url"]
            existing.processing_days = data["processing_days"]
            existing.prerequisites = data["prerequisites"]

    db.commit()
    return added_count
