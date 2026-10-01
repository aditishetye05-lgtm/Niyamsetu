-- Supabase PostgreSQL Schema for NiyamSetu

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
    id VARCHAR(36) PRIMARY KEY,
    enterprise_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    investment_inr NUMERIC(15, 2) NOT NULL,
    employee_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_businesses_enterprise_name ON public.businesses(enterprise_name);
CREATE INDEX IF NOT EXISTS idx_businesses_state ON public.businesses(state);
CREATE INDEX IF NOT EXISTS idx_businesses_business_type ON public.businesses(business_type);

-- 2. Create master_approvals table
CREATE TABLE IF NOT EXISTS public.master_approvals (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    official_portal_url VARCHAR(500),
    processing_days INTEGER NOT NULL DEFAULT 30,
    prerequisites VARCHAR(500) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_master_approvals_code ON public.master_approvals(code);

-- 3. Create business_approvals table
CREATE TABLE IF NOT EXISTS public.business_approvals (
    id VARCHAR(36) PRIMARY KEY,
    business_id VARCHAR(36) NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    approval_id VARCHAR(36) NOT NULL REFERENCES public.master_approvals(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'not_applied',
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    application_id VARCHAR(100),
    tracking_stage VARCHAR(50) NOT NULL DEFAULT 'submitted',
    application_date TIMESTAMP WITH TIME ZONE,
    approval_expiry_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_business_approvals_business_id ON public.business_approvals(business_id);
CREATE INDEX IF NOT EXISTS idx_business_approvals_approval_id ON public.business_approvals(approval_id);
CREATE INDEX IF NOT EXISTS idx_business_approvals_status ON public.business_approvals(status);
CREATE INDEX IF NOT EXISTS idx_business_approvals_application_id ON public.business_approvals(application_id);

-- 7. Create alerts_and_reminders table
CREATE TABLE IF NOT EXISTS public.alerts_and_reminders (
    id VARCHAR(36) PRIMARY KEY,
    business_id VARCHAR(36) NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    approval_id VARCHAR(36) REFERENCES public.master_approvals(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_business_id ON public.alerts_and_reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON public.alerts_and_reminders(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON public.alerts_and_reminders(is_read);

-- 4. Create master_documents table
CREATE TABLE IF NOT EXISTS public.master_documents (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    valid_formats VARCHAR(100) NOT NULL DEFAULT 'pdf,jpg,png',
    max_size_mb INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_master_documents_code ON public.master_documents(code);

-- 5. Create approval_required_documents table (Cross-reference linking)
CREATE TABLE IF NOT EXISTS public.approval_required_documents (
    id VARCHAR(36) PRIMARY KEY,
    master_approval_id VARCHAR(36) NOT NULL REFERENCES public.master_approvals(id) ON DELETE CASCADE,
    master_document_id VARCHAR(36) NOT NULL REFERENCES public.master_documents(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ard_master_approval ON public.approval_required_documents(master_approval_id);
CREATE INDEX IF NOT EXISTS idx_ard_master_document ON public.approval_required_documents(master_document_id);

-- 6. Create vault_documents table (User uploaded files reused across approvals)
CREATE TABLE IF NOT EXISTS public.vault_documents (
    id VARCHAR(36) PRIMARY KEY,
    business_id VARCHAR(36) NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    master_document_id VARCHAR(36) NOT NULL REFERENCES public.master_documents(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    mime_type VARCHAR(50),
    file_size_kb INTEGER NOT NULL DEFAULT 0,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'verified',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_documents_business ON public.vault_documents(business_id);
CREATE INDEX IF NOT EXISTS idx_vault_documents_master_doc ON public.vault_documents(master_document_id);

-- Comments
COMMENT ON TABLE public.businesses IS 'Stores registered business profiles for regulatory navigation';
COMMENT ON TABLE public.master_approvals IS 'Master catalog of statutory Indian licences, NOCs, and clearances';
COMMENT ON TABLE public.business_approvals IS 'Mapped approval checklist and real-time status for an individual enterprise';
COMMENT ON TABLE public.master_documents IS 'Master catalog of standardized Indian business compliance documents';
COMMENT ON TABLE public.approval_required_documents IS 'Mapping of required documents per statutory clearance';
COMMENT ON TABLE public.vault_documents IS 'Secure document vault enabling cross-approval document reuse';
