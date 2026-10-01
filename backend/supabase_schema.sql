-- Supabase PostgreSQL Schema for NiyamSetu

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    investment_inr NUMERIC(15, 2) NOT NULL,
    employee_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index on enterprise_name and state for quick query/filtering
CREATE INDEX IF NOT EXISTS idx_businesses_enterprise_name ON public.businesses(enterprise_name);
CREATE INDEX IF NOT EXISTS idx_businesses_state ON public.businesses(state);
CREATE INDEX IF NOT EXISTS idx_businesses_business_type ON public.businesses(business_type);

-- Comment on table and columns
COMMENT ON TABLE public.businesses IS 'Stores registered business profiles for regulatory navigation';
COMMENT ON COLUMN public.businesses.id IS 'Unique identifier for the enterprise profile';
COMMENT ON COLUMN public.businesses.investment_inr IS 'Planned capital investment in INR (Rupees)';
