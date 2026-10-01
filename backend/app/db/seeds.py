from sqlalchemy.orm import Session
from app.models.approval import MasterApproval
from app.models.document import MasterDocument, ApprovalRequiredDocument

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

MASTER_DOCUMENTS_DATA = [
    {
        "code": "DOC_PAN",
        "name": "Permanent Account Number (PAN) Card",
        "description": "Entity PAN card or individual promoter PAN issued by the Income Tax Department.",
        "valid_formats": "pdf,jpg,png",
        "max_size_mb": 5,
    },
    {
        "code": "DOC_AADHAAR",
        "name": "Aadhaar / Identity Proof of Key Persons",
        "description": "Government issued photo identification for authorized signatories, directors, or proprietors.",
        "valid_formats": "pdf,jpg,png",
        "max_size_mb": 5,
    },
    {
        "code": "DOC_INCORPORATION_CERT",
        "name": "Certificate of Incorporation / Partnership Deed",
        "description": "Official company incorporation certificate, LLP agreement, or registered partnership deed.",
        "valid_formats": "pdf",
        "max_size_mb": 10,
    },
    {
        "code": "DOC_RENT_AGREEMENT",
        "name": "Premises Proof / Registered Rent Agreement",
        "description": "Registered lease/rental agreement or ownership deed along with recent electricity bill/utility receipt.",
        "valid_formats": "pdf",
        "max_size_mb": 10,
    },
    {
        "code": "DOC_SITE_PLAN",
        "name": "Architectural Layout / Site Plan",
        "description": "Certified scale floor plan showing machinery layout, safety exits, ventilation, and dimensions.",
        "valid_formats": "pdf,jpg,png",
        "max_size_mb": 15,
    },
    {
        "code": "DOC_FSMS_PLAN",
        "name": "Food Safety Management System (FSMS) Plan",
        "description": "Documented Hazard Analysis Critical Control Point (HACCP) plan and hygiene protocol.",
        "valid_formats": "pdf",
        "max_size_mb": 10,
    },
    {
        "code": "DOC_WATER_TEST",
        "name": "Potable Water Quality Test Report",
        "description": "NABL accredited laboratory chemical & microbiological water analysis report conforming to IS:10500.",
        "valid_formats": "pdf",
        "max_size_mb": 5,
    },
    {
        "code": "DOC_FIRE_SAFETY_PLAN",
        "name": "Fire Safety Equipment & Evacuation Plan",
        "description": "Comprehensive schematic of smoke detectors, hydrants, extinguishers, and emergency evacuation drills.",
        "valid_formats": "pdf",
        "max_size_mb": 10,
    },
    {
        "code": "DOC_ELECTRIC_SAFETY",
        "name": "Electrical Safety & Load Sanction Letter",
        "description": "DISCOM power sanction order and Electrical Inspectorate safety clearance certificate.",
        "valid_formats": "pdf",
        "max_size_mb": 5,
    },
    {
        "code": "DOC_PROCESS_FLOW",
        "name": "Industrial Manufacturing Process Flowchart",
        "description": "Detailed sequential manufacturing flowchart specifying inputs, chemical reactions, and emissions.",
        "valid_formats": "pdf",
        "max_size_mb": 5,
    },
    {
        "code": "DOC_EFFLUENT_PLAN",
        "name": "Effluent Treatment Scheme (ETP/STP)",
        "description": "Engineering scheme for treatment and disposal of industrial trade effluents and hazardous waste.",
        "valid_formats": "pdf",
        "max_size_mb": 10,
    },
    {
        "code": "DOC_MACHINERY_LIST",
        "name": "Installed Machinery & Power Rating Schedule",
        "description": "Comprehensive asset register of manufacturing equipment with connected motor kilowatt/horsepower ratings.",
        "valid_formats": "pdf,xlsx",
        "max_size_mb": 5,
    },
]

# Mapping of approval codes to required document codes
APPROVAL_DOC_MAPPINGS = {
    "BIZ_REG": ["DOC_INCORPORATION_CERT", "DOC_PAN", "DOC_AADHAAR", "DOC_RENT_AGREEMENT"],
    "GST_REG": ["DOC_PAN", "DOC_AADHAAR", "DOC_RENT_AGREEMENT"],
    "MSME_UDYAM": ["DOC_PAN", "DOC_AADHAAR"],
    "TRADE_LICENCE": ["DOC_RENT_AGREEMENT", "DOC_PAN", "DOC_SITE_PLAN"],
    "FIRE_NOC": ["DOC_SITE_PLAN", "DOC_FIRE_SAFETY_PLAN", "DOC_ELECTRIC_SAFETY", "DOC_RENT_AGREEMENT"],
    "PCB_CTE": ["DOC_PROCESS_FLOW", "DOC_EFFLUENT_PLAN", "DOC_SITE_PLAN", "DOC_RENT_AGREEMENT"],
    "FACTORY_LICENCE": ["DOC_SITE_PLAN", "DOC_MACHINERY_LIST", "DOC_ELECTRIC_SAFETY", "DOC_FIRE_SAFETY_PLAN"],
    "FSSAI_LICENCE": ["DOC_SITE_PLAN", "DOC_FSMS_PLAN", "DOC_WATER_TEST", "DOC_RENT_AGREEMENT", "DOC_PAN"],
    "SHOPS_EST": ["DOC_RENT_AGREEMENT", "DOC_PAN", "DOC_AADHAAR"],
    "BOILER_REG": ["DOC_SITE_PLAN", "DOC_MACHINERY_LIST"],
}


def seed_master_approvals(db: Session) -> int:
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
            existing.name = data["name"]
            existing.department = data["department"]
            existing.description = data["description"]
            existing.official_portal_url = data["official_portal_url"]
            existing.processing_days = data["processing_days"]
            existing.prerequisites = data["prerequisites"]
    db.commit()
    return added_count


def seed_regulatory_documents(db: Session) -> int:
    """
    Seeds master documents and links them to corresponding approvals.
    """
    doc_added = 0
    for doc_data in MASTER_DOCUMENTS_DATA:
        existing = (
            db.query(MasterDocument)
            .filter(MasterDocument.code == doc_data["code"])
            .first()
        )
        if not existing:
            doc = MasterDocument(**doc_data)
            db.add(doc)
            doc_added += 1
        else:
            existing.name = doc_data["name"]
            existing.description = doc_data["description"]
            existing.valid_formats = doc_data["valid_formats"]
            existing.max_size_mb = doc_data["max_size_mb"]
    db.commit()

    # Map documents to approvals
    all_masters = {a.code: a for a in db.query(MasterApproval).all()}
    all_docs = {d.code: d for d in db.query(MasterDocument).all()}

    mapping_added = 0
    for app_code, doc_codes in APPROVAL_DOC_MAPPINGS.items():
        master_app = all_masters.get(app_code)
        if not master_app:
            continue

        for doc_code in doc_codes:
            master_doc = all_docs.get(doc_code)
            if not master_doc:
                continue

            existing_link = (
                db.query(ApprovalRequiredDocument)
                .filter(
                    ApprovalRequiredDocument.master_approval_id == master_app.id,
                    ApprovalRequiredDocument.master_document_id == master_doc.id,
                )
                .first()
            )
            if not existing_link:
                link = ApprovalRequiredDocument(
                    master_approval_id=master_app.id,
                    master_document_id=master_doc.id,
                    is_mandatory=True,
                )
                db.add(link)
                mapping_added += 1

    db.commit()
    return doc_added + mapping_added


from datetime import datetime, timedelta
from app.models.alert import AlertAndReminder


def seed_business_alerts(business_id: str, db: Session):
    """
    Idempotently seeds default compliance alerts and reminders for an enterprise.
    """
    existing = (
        db.query(AlertAndReminder)
        .filter(AlertAndReminder.business_id == business_id)
        .first()
    )
    if existing:
        return

    # Find master approvals for reference
    fire_app = db.query(MasterApproval).filter(MasterApproval.code == "FIRE_NOC").first()
    fssai_app = db.query(MasterApproval).filter(MasterApproval.code == "FSSAI_LICENCE").first()
    pcb_app = db.query(MasterApproval).filter(MasterApproval.code == "PCB_CTE").first()

    default_alerts = [
        {
            "business_id": business_id,
            "approval_id": fire_app.id if fire_app else None,
            "alert_type": "renewal_due",
            "title": "Fire NOC renewal due in 30 days",
            "message": "Annual audit and fire safety certification renewal is due soon. Ensure fire hydrant logbooks are signed.",
            "due_date": datetime.utcnow() + timedelta(days=30),
            "is_read": False,
        },
        {
            "business_id": business_id,
            "approval_id": fssai_app.id if fssai_app else None,
            "alert_type": "pending_action",
            "title": "Action Required: Upload Water Test Report for FSSAI",
            "message": "FSSAI license application requires an accredited NABL water quality test report before scrutiny.",
            "due_date": datetime.utcnow() + timedelta(days=7),
            "is_read": False,
        },
        {
            "business_id": business_id,
            "approval_id": pcb_app.id if pcb_app else None,
            "alert_type": "status_update",
            "title": "Pollution Consent (CTE) application status updated",
            "message": "State Pollution Control Board has moved your application to Department Technical Scrutiny stage.",
            "due_date": None,
            "is_read": False,
        },
    ]

    for a_data in default_alerts:
        db.add(AlertAndReminder(**a_data))
    db.commit()


def seed_all(db: Session):
    seed_master_approvals(db)
    seed_regulatory_documents(db)

