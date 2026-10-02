import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict, Any, List
from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_email_html(
    title: str,
    preheader: str,
    badge_text: str,
    badge_color: str,  # "emerald", "amber", "indigo", "red"
    body_paragraphs: List[str],
    details_table: Optional[Dict[str, str]] = None,
    cta_text: Optional[str] = None,
    cta_url: Optional[str] = None,
) -> str:
    """Renders a polished, enterprise HTML transactional email for NiyamSetu."""
    badge_styles = {
        "emerald": "background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;",
        "amber": "background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;",
        "indigo": "background-color: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe;",
        "red": "background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca;",
    }
    badge_style = badge_styles.get(badge_color, badge_styles["indigo"])

    table_rows = ""
    if details_table:
        for k, v in details_table.items():
            table_rows += f"""
            <tr>
              <td style="padding: 8px 12px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">{k}</td>
              <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">{v}</td>
            </tr>
            """

    table_html = f"""
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 8px; overflow: hidden;">
      {table_rows}
    </table>
    """ if details_table else ""

    cta_html = f"""
    <div style="text-align: center; margin: 30px 0;">
      <a href="{cta_url}" style="background: linear-gradient(135deg, #d97706, #4f46e5); color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
        {cta_text} &rarr;
      </a>
    </div>
    """ if cta_text and cta_url else ""

    paragraphs_html = "".join([f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #334155;'>{p}</p>" for p in body_paragraphs])

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 10px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a, #1e1b4b); padding: 24px 32px; color: #ffffff;">
                  <table width="100%">
                    <tr>
                      <td>
                        <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Niyam<span style="color: #f59e0b;">Setu</span></span>
                        <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">National Regulatory Compliance & Approval Engine</div>
                      </td>
                      <td align="right">
                        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; {badge_style}">
                          {badge_text}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 32px;">
                  <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 800; color: #0f172a;">{title}</h1>
                  <div style="font-size: 13px; color: #64748b; margin-bottom: 24px;">{preheader}</div>
                  
                  {paragraphs_html}
                  {table_html}
                  {cta_html}

                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;">
                  <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">
                    Statutory Notice: This is an automated compliance notification from NiyamSetu. Information is synchronized against National Single Window System (NSWS) and relevant state regulatory departments.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 16px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
                  &copy; 2026 NiyamSetu &bull; Digital India Compliance Infrastructure
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def send_email_notification(
    to_email: str,
    subject: str,
    html_content: str,
) -> bool:
    """
    Sends an email via SMTP or logs to console as fallback in development.
    """
    if not settings.SMTP_SERVER or not settings.SMTP_USERNAME:
        # Fallback Logging Mode (zero-config dev)
        print(f"\n=======================================================")
        print(f"[EMAIL DISPATCH - DEV SIMULATION]")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Content Length: {len(html_content)} bytes")
        print(f"Status: Successfully Dispatched (Simulated)")
        print(f"=======================================================\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.FROM_EMAIL
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.FROM_EMAIL, [to_email], msg.as_string())
        
        logger.info(f"Email successfully delivered to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to deliver SMTP email to {to_email}: {e}")
        return False


def dispatch_status_change_email(
    to_email: str,
    enterprise_name: str,
    clearance_name: str,
    new_stage: str,
    application_id: Optional[str] = None,
    department: str = "State / Central Regulatory Authority",
    background_tasks: Optional[Any] = None,
    business_id: Optional[str] = None,
) -> bool:
    """Triggered on clearance status transition."""
    status_labels = {
        "submitted": "Statutory Submission Acknowledged",
        "documents_verified": "Vault Documents Verified by Department",
        "department_inspection": "Site Inspection Verification Scheduled",
        "approved": "Clearance Certificate Issued & Approved",
        "under_review": "Competent Authority Scrutiny in Progress",
        "final_review": "Final Review & Scrutiny",
    }
    badge_label = status_labels.get(new_stage, new_stage.replace("_", " ").title())
    color = "emerald" if new_stage == "approved" else "indigo" if new_stage == "submitted" else "amber"

    body = [
        f"Dear <strong>{enterprise_name}</strong>,",
        f"This is an official statutory update regarding your regulatory filing for <strong>{clearance_name}</strong> under the <strong>{department}</strong> jurisdiction.",
        f"The official status has transitioned to: <strong>{badge_label}</strong>.",
    ]

    details = {
        "Enterprise Name": enterprise_name,
        "Clearance Name": clearance_name,
        "Statutory Authority": department,
        "Current Status": badge_label,
    }
    if application_id:
        details["Application Ref. ID"] = application_id

    cta_url = f"http://localhost:3000/tracker?business_id={business_id}" if business_id else "http://localhost:3000"

    html = generate_email_html(
        title=f"Regulatory Status Update: {clearance_name}",
        preheader=f"Your clearance application status is now {badge_label}.",
        badge_text=badge_label,
        badge_color=color,
        body_paragraphs=body,
        details_table=details,
        cta_text="View Live Progress Tracker",
        cta_url=cta_url,
    )

    subject = f"[NiyamSetu Alert] {clearance_name} Status: {badge_label}"

    if background_tasks:
        background_tasks.add_task(send_email_notification, to_email, subject, html)
        return True
    return send_email_notification(to_email=to_email, subject=subject, html_content=html)


def dispatch_renewal_warning_email(
    to_email: str,
    enterprise_name: str,
    clearance_name: str,
    days_remaining: int = 30,
    due_date: str = "Immediate",
    department: str = "Competent Statutory Authority",
    background_tasks: Optional[Any] = None,
    business_id: Optional[str] = None,
) -> bool:
    """Triggered on upcoming license expiry or renewal deadline."""
    body = [
        f"Dear <strong>{enterprise_name}</strong>,",
        f"A critical statutory compliance deadline is approaching for your <strong>{clearance_name}</strong> under <strong>{department}</strong>.",
        f"To avoid statutory penalties or operational suspension under the relevant Industrial Acts, renewal must be submitted prior to the expiration date.",
    ]

    details = {
        "Enterprise": enterprise_name,
        "Clearance": clearance_name,
        "Issuing Authority": department,
        "Renewal Due Date": due_date,
        "Time Remaining": f"{days_remaining} Days Remaining",
    }

    cta_url = f"http://localhost:3000/tracker?business_id={business_id}" if business_id else "http://localhost:3000"

    html = generate_email_html(
        title=f"⚠️ Statutory Renewal Notice: {clearance_name}",
        preheader=f"Renewal due in {days_remaining} days ({due_date}). Action required.",
        badge_text=f"Due in {days_remaining} Days",
        badge_color="red" if days_remaining <= 15 else "amber",
        body_paragraphs=body,
        details_table=details,
        cta_text="Open Official Portal & File Renewal",
        cta_url=cta_url,
    )

    subject = f"[Action Required] {clearance_name} Renewal Due in {days_remaining} Days"

    if background_tasks:
        background_tasks.add_task(send_email_notification, to_email, subject, html)
        return True
    return send_email_notification(to_email=to_email, subject=subject, html_content=html)


dispatch_renewal_alert_email = dispatch_renewal_warning_email

