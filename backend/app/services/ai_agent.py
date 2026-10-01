import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
import httpx

logger = logging.getLogger(__name__)


def generate_system_prompt(ctx: Dict[str, Any]) -> str:
    """
    Constructs an authoritative system prompt anchored in Indian regulatory bodies:
    NSWS, FSSAI FoSCoS, MoEFCC/SPCB, DISH (Factories Act 1948), and State Fire Services.
    """
    biz_name = ctx.get("enterprise_name", "Enterprise")
    sector = ctx.get("business_type", "General Industry")
    state = ctx.get("state", "India")
    inv = ctx.get("investment_formatted", "N/A")
    employees = ctx.get("employee_count", 0)
    msme_tier = ctx.get("msme_tier", "N/A")
    score = ctx.get("compliance_score", 0)
    rating = ctx.get("compliance_rating", "Needs Attention")

    can_apply = [c["name"] for c in ctx.get("can_apply_now", [])]
    blocked = [f"{b['name']} (Blocked by: {', '.join(b.get('prerequisites', []))})" for b in ctx.get("blocked_clearances", [])]
    missing_docs = [d["name"] for d in ctx.get("missing_documents", [])[:6]]

    prompt = f"""You are NiyamSetu AI, an expert statutory regulatory advisor and compliance copilot for Indian businesses, MSMEs, and industrial enterprises.
You are directly grounded in India's National Single Window System (NSWS), FSSAI FoSCoS, State Pollution Control Boards (SPCB CTE/CTO under Air & Water Acts), Directorate of Industrial Safety & Health (DISH - Factories Act 1948), State Fire Safety Directives, and Labour Acts.

### Live Enterprise Profile:
- Enterprise: {biz_name}
- Industry Sector: {sector}
- State Jurisdiction: {state}
- Capital Investment: {inv}
- Workforce: {employees} Employees
- MSME Category: {msme_tier}
- Compliance Readiness Score: {score}% ({rating})

### Current Compliance Status:
- Clearances Ready to Apply Now: {', '.join(can_apply) if can_apply else 'None unblocked'}
- Blocked Clearances: {'; '.join(blocked) if blocked else 'None'}
- Missing Mandatory Documents: {', '.join(missing_docs) if missing_docs else 'All primary documents uploaded'}

### Rules for Advisory:
1. Always tailor your advice specifically to {biz_name}'s sector ({sector}) in {state}.
2. Give actionable statutory steps, cite the correct government departments/portals, and state realistic turnaround timelines (TAT in working days).
3. Clearly explain why certain clearances are required or why they are currently blocked in the dependency DAG.
4. Keep explanations professional, crisp, easy to understand, and encouraging.
5. Provide 2 to 3 concise suggested next action items.
"""
    return prompt


def run_deterministic_expert_system(message: str, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
    """
    Intelligent deterministic expert advisor for Indian statutory compliances.
    Provides precise, grounded regulatory answers even without an external LLM API key.
    """
    msg = message.lower().strip()
    biz_name = ctx.get("enterprise_name", "your enterprise")
    sector = ctx.get("business_type", "General Industry")
    state = ctx.get("state", "your state")
    inv = ctx.get("investment_formatted", "your investment bracket")
    score = ctx.get("compliance_score", 0)
    rating = ctx.get("compliance_rating", "In Progress")

    missing_docs = ctx.get("missing_documents", [])
    can_apply = ctx.get("can_apply_now", [])
    blocked = ctx.get("blocked_clearances", [])

    # 1. Missing Documents / Vault queries
    if any(k in msg for k in ["document", "vault", "upload", "missing", "papers", "checklist"]):
        if missing_docs:
            doc_bullets = "\n".join([f"• **{d['name']}** ({d.get('category', 'Statutory')})" for d in missing_docs[:5]])
            reply = (
                f"For **{biz_name}** ({sector} in {state}), you currently have **{len(missing_docs)} pending statutory documents** in your vault backlog:\n\n"
                f"{doc_bullets}\n\n"
                f"💡 **Statutory Recommendation:** Uploading the **Layout / Site Plan** and **Water Quality Test Report** first will satisfy multiple clearances simultaneously through NiyamSetu's Smart Document Vault cross-approval reuse."
            )
            actions = ["Upload Missing Documents in Vault", "Check Compliance Score", "View Dependency Map"]
        else:
            reply = (
                f"Great news! **{biz_name}** has uploaded all mandatory primary vault documents. "
                f"Your statutory document readiness is fully primed for official portal handoffs."
            )
            actions = ["Proceed to Official Portal", "View Dependency Map", "Track Application Status"]
        return reply, actions

    # 2. FSSAI / Food Safety Queries
    if any(k in msg for k in ["fssai", "food", "foscos", "food licence", "hygiene"]):
        reply = (
            f"### Food Safety & Standards Authority of India (FSSAI) Guidance\n\n"
            f"For **{biz_name}** operating as a **{sector}** in **{state}** with an investment of **{inv}**:\n\n"
            f"1. **Category**: Your enterprise falls under **State / Central FSSAI Manufacturing Licence**.\n"
            f"2. **Official Portal**: Applications are filed via **FoSCoS** (https://foscos.fssai.gov.in).\n"
            f"3. **Prerequisites**: Requires an active **Business Registration / Incorporation Certificate** (MCA/UDYAM).\n"
            f"4. **Key Documents**: Factory Layout Plan, List of Equipment/Machinery, Water Potability Test Report from an NABL accredited lab, and Food Safety Management System (FSMS) plan.\n"
            f"5. **Turnaround Time**: Standard statutory processing time is **30 to 45 working days** following physical inspection by the Food Safety Officer."
        )
        actions = ["Check FSSAI Document Checklist", "Proceed to FoSCoS Portal", "Track FSSAI Application"]
        return reply, actions

    # 3. Pollution Control / PCB / CTE / CTO Queries
    if any(k in msg for k in ["pollution", "pcb", "cte", "cto", "consent", "environment", "spcb"]):
        reply = (
            f"### State Pollution Control Board (SPCB) Consent Guidance\n\n"
            f"Under the *Water (Prevention & Control of Pollution) Act 1974* and *Air Act 1981*, industrial operations in **{state}** require consent:\n\n"
            f"1. **Consent to Establish (CTE)**: Must be acquired **before breaking ground or installing heavy machinery**.\n"
            f"2. **Industrial Categorization**: Depending on effluent and emission indices, food and manufacturing plants are typically classified under **Orange or Green Category**.\n"
            f"3. **Consent to Operate (CTO)**: Applied 30 days before starting commercial production once CTE conditions and effluent treatment facilities (ETP/STP) are verified.\n"
            f"4. **Statutory Fee**: Based on gross capital investment of **{inv}**.\n"
            f"5. **Estimated TAT**: Approximately **45 to 60 working days**."
        )
        actions = ["View SPCB Prerequisites", "Upload Project Report", "Open Dependency Map"]
        return reply, actions

    # 4. Fire NOC Queries
    if any(k in msg for k in ["fire", "fire noc", "safety", "fire brigade", "hydrant"]):
        reply = (
            f"### Fire Safety NOC Guidance\n\n"
            f"Issued by the **State Fire & Emergency Services** in **{state}**:\n\n"
            f"1. **Independence**: Fire Safety NOC is an **Independent Clearance**—it has zero statutory prerequisites and you can apply immediately!\n"
            f"2. **Required Provisions**: Fire safety building layout drawing, certified fire extinguisher placement, hose reel installation, and building structural stability certificate.\n"
            f"3. **Site Inspection**: A designated Fire Officer inspects access roads (minimum 6m width) and emergency exits.\n"
            f"4. **Validity & Renewal**: Provisional NOC during construction, Final NOC valid for 1 to 3 years, renewable annually."
        )
        actions = ["Apply for Fire Safety NOC", "Upload Fire Safety Plan", "Set Renewal Alert"]
        return reply, actions

    # 5. Factory Licence / DISH Queries
    if any(k in msg for k in ["factory", "factories act", "dish", "labour", "machinery"]):
        reply = (
            f"### Factory Licence (Factories Act 1948) Guidance\n\n"
            f"Administered by the **Directorate of Industrial Safety & Health (DISH)**:\n\n"
            f"1. **Applicability**: Applies to premises with **10 or more workers with power**, or **20 or more workers without power** (Your team: **{ctx.get('employee_count', 0)} employees**).\n"
            f"2. **Strict Prerequisites**: Factory Licence is a downstream dependent clearance—you must first secure:\n"
            f"   - **Pollution Consent (CTE)** from SPCB\n"
            f"   - **Fire Safety NOC**\n"
            f"   - **Approved Factory Building Layout Plan**\n"
            f"3. **Statutory TAT**: **30 to 45 working days** post on-site safety inspection."
        )
        actions = ["View Factory Licence Dependencies", "Check Blocked Clearances", "Upload Machinery Layout"]
        return reply, actions

    # 6. Blocked clearances & Dependency DAG queries
    if any(k in msg for k in ["blocked", "dependency", "prerequisite", "dag", "sequence", "order", "step"]):
        if blocked:
            b_list = "\n".join([f"• **{b['name']}**: Blocked until {', '.join(b.get('prerequisites', []))} are approved" for b in blocked[:4]])
            ready_list = ", ".join([c["name"] for c in can_apply]) if can_apply else "Business Registration / Fire NOC"
            reply = (
                f"### Regulatory Dependency Sequence for {biz_name}\n\n"
                f"In Indian single-window compliance, downstream approvals legally require upstream clearance certificates. "
                f"Here is your current clearance dependency status:\n\n"
                f"**Clearances Blocked Right Now:**\n{b_list}\n\n"
                f"🚀 **What to apply for first:**\n"
                f"You should immediately focus on **{ready_list}** to unblock the rest of your industrial pipeline."
            )
            actions = ["Open Interactive Dependency Map", "Apply for Unblocked Clearances", "Review Document Vault"]
        else:
            reply = (
                f"All statutory approvals for **{biz_name}** are currently unblocked and eligible for submission!"
            )
            actions = ["Proceed to Official Portal", "Track Application Status", "View Roadmap"]
        return reply, actions

    # 7. Compliance Score queries
    if any(k in msg for k in ["score", "percentage", "rating", "how is my score", "calculate", "improve"]):
        reply = (
            f"### Compliance Readiness Score Analysis\n\n"
            f"Your current readiness score is **{score}% ({rating})**.\n\n"
            f"**Dynamic Scoring Formula:**\n"
            f"1. **Document Readiness (40%)**: Ratio of uploaded statutory vault documents against requirements.\n"
            f"2. **Approvals Progress (30%)**: Clearances moved from 'not applied' to 'submitted' or 'approved'.\n"
            f"3. **Prerequisite Resolution (20%)**: Unblocked clearances ready to apply in the DAG.\n"
            f"4. **Validity & Timelines (10%)**: Absence of expired or overdue renewal deadlines.\n\n"
            f"📈 **How to increase your score to 90%+:**\n"
            f"Upload your remaining vault documents and enter your official government Application Reference IDs in Step 6."
        )
        actions = ["Upload Documents to Boost Score", "Enter Official Application IDs", "View Score Breakdown"]
        return reply, actions

    # 8. Default Contextual Advisory
    can_apply_names = ", ".join([c["name"] for c in can_apply[:3]]) if can_apply else "Business Registration"
    reply = (
        f"Hello! I am your **NiyamSetu AI Regulatory Copilot** for **{biz_name}** ({sector} in {state}).\n\n"
        f"📊 **Current Status Snapshot:**\n"
        f"• **Compliance Readiness Score:** {score}% ({rating})\n"
        f"• **Ready to Apply Immediately:** {can_apply_names}\n"
        f"• **Pending Vault Documents:** {len(missing_docs)} documents\n\n"
        f"💡 **Next Recommended Step:**\n"
        f"Complete your required vault uploads (especially Layout Plan and Water Test Reports) and proceed to the official Single-Window portal for statutory filing."
    )
    actions = ["What documents are missing?", "Why is my Factory Licence blocked?", "How do I reach 100% Score?"]
    return reply, actions


async def get_ai_chat_response(message: str, ctx: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dispatches to OpenAI or Gemini API if keys are provided,
    otherwise leverages the robust deterministic statutory expert rules.
    """
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    # Try LLM if key is present
    if openai_key or gemini_key:
        try:
            system_prompt = generate_system_prompt(ctx)

            if openai_key:
                # Call OpenAI API via httpx
                async with httpx.AsyncClient(timeout=15.0) as client:
                    res = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {openai_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "gpt-4o-mini",
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": message},
                            ],
                            "temperature": 0.3,
                            "max_tokens": 600,
                        },
                    )
                    if res.status_code == 200:
                        data = res.json()
                        reply = data["choices"][0]["message"]["content"]
                        # Generate contextual suggestions
                        _, actions = run_deterministic_expert_system(message, ctx)
                        return {
                            "reply": reply,
                            "suggested_actions": actions,
                            "timestamp": datetime.utcnow().isoformat(),
                            "engine": "openai-gpt4o",
                        }

            elif gemini_key:
                # Call Gemini API via httpx
                async with httpx.AsyncClient(timeout=15.0) as client:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                    res = await client.post(
                        url,
                        headers={"Content-Type": "application/json"},
                        json={
                            "contents": [
                                {
                                    "role": "user",
                                    "parts": [{"text": f"{system_prompt}\n\nUser Question: {message}"}],
                                }
                            ],
                            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 600},
                        },
                    )
                    if res.status_code == 200:
                        data = res.json()
                        reply = data["candidates"][0]["content"]["parts"][0]["text"]
                        _, actions = run_deterministic_expert_system(message, ctx)
                        return {
                            "reply": reply,
                            "suggested_actions": actions,
                            "timestamp": datetime.utcnow().isoformat(),
                            "engine": "gemini-1.5-flash",
                        }

        except Exception as e:
            logger.warning(f"External LLM invocation failed, gracefully falling back to statutory expert system: {e}")

    # Fallback to intelligent statutory expert system
    reply, actions = run_deterministic_expert_system(message, ctx)
    return {
        "reply": reply,
        "suggested_actions": actions,
        "timestamp": datetime.utcnow().isoformat(),
        "engine": "niyamsetu-expert-rules",
    }


def generate_contextual_suggestions(ctx: Dict[str, Any]) -> List[str]:
    """
    Returns 4 context-sensitive prompt chips tailored to current business status.
    """
    sector = ctx.get("business_type", "Food Processing Unit")
    blocked = ctx.get("blocked_clearances", [])
    missing = ctx.get("missing_documents", [])
    score = ctx.get("compliance_score", 0)

    suggestions = []

    # 1. Clearance-specific
    if "Food" in sector:
        suggestions.append("What are the mandatory documents for FSSAI Licence?")
    elif "Manufacturing" in sector:
        suggestions.append("What is the difference between SPCB CTE and CTO?")
    else:
        suggestions.append("Which clearances can I apply for immediately?")

    # 2. Blocked status
    if blocked:
        first_blocked = blocked[0]["name"]
        suggestions.append(f"Why is my {first_blocked} clearance blocked?")
    else:
        suggestions.append("How do I proceed to the official Single-Window portal?")

    # 3. Documents
    if missing:
        suggestions.append(f"Which of my {len(missing)} missing documents should I upload first?")
    else:
        suggestions.append("How do I set up renewal alerts for my Fire NOC?")

    # 4. Score
    suggestions.append(f"How is my {score}% Compliance Readiness Score calculated?")

    return suggestions[:4]
