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

-- Indexes for businesses
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_business_approvals_business_id ON public.business_approvals(business_id);
CREATE INDEX IF NOT EXISTS idx_business_approvals_approval_id ON public.business_approvals(approval_id);
CREATE INDEX IF NOT EXISTS idx_business_approvals_status ON public.business_approvals(status);

-- Comments
COMMENT ON TABLE public.businesses IS 'Stores registered business profiles for regulatory navigation';
COMMENT ON TABLE public.master_approvals IS 'Master catalog of statutory Indian licences, NOCs, and clearances';
COMMENT ON TABLE public.business_approvals IS 'Mapped approval checklist and real-time status for an individual enterprise';
