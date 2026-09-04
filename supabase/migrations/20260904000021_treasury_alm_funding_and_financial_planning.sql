-- Migration: 20260904000021_treasury_alm_funding_and_financial_planning.sql
-- Description: Financial Planning, Group Treasury, ALM Maturity Ladders, Wholesale Funding Facilities & 3-Statement Modeling

-- ============================================================================
-- 1. TREASURY BOOKS & POSITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS treasury_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. TBK-NG-OPERATING, TBK-NE-OPERATING
    book_name VARCHAR(255) NOT NULL,
    legal_entity VARCHAR(128) NOT NULL,
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE', 'GB', 'US')),
    base_currency VARCHAR(3) NOT NULL CHECK (base_currency IN ('NGN', 'XOF', 'USD', 'EUR', 'GBP')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESTRICTED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treasury_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES treasury_books(id) ON DELETE CASCADE,
    position_code VARCHAR(64) NOT NULL, -- e.g. POS-PROVIDUS-NOSTRO-NGN
    account_code VARCHAR(32) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD', 'EUR', 'GBP')),
    gross_balance NUMERIC(18, 4) NOT NULL DEFAULT 0,
    available_liquidity NUMERIC(18, 4) NOT NULL DEFAULT 0,
    restricted_liquidity NUMERIC(18, 4) NOT NULL DEFAULT 0,
    reserved_liquidity NUMERIC(18, 4) NOT NULL DEFAULT 0,
    pending_settlement NUMERIC(18, 4) NOT NULL DEFAULT 0,
    target_safety_buffer NUMERIC(18, 4) NOT NULL DEFAULT 0,
    liquidity_status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY' CHECK (liquidity_status IN (
        'HEALTHY', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL', 'EMERGENCY'
    )),
    last_reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. ALM MATURITY & BEHAVIOURAL ASSUMPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS alm_assumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assumption_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. ASSUMP-WALLET-RETENTION-v1
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (category IN (
        'WALLET_STICKINESS', 'MERCHANT_SETTLEMENT_RUNOFF', 'AGENT_FLOAT_VOLATILITY', 'INTEREST_RATE_SENSITIVITY'
    )),
    version VARCHAR(16) NOT NULL DEFAULT 'v1',
    effective_date DATE NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'DEPRECATED')),
    approved_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alm_maturity_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_code VARCHAR(32) NOT NULL, -- e.g. 0-1D, 2-7D, 8-30D, 31-90D, 91-180D, 181-365D, 1-2Y, 2-5Y, 5Y+
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD', 'EUR')),
    inflows_contractual NUMERIC(18, 4) NOT NULL DEFAULT 0,
    outflows_contractual NUMERIC(18, 4) NOT NULL DEFAULT 0,
    net_gap_contractual NUMERIC(18, 4) NOT NULL DEFAULT 0,
    inflows_behavioural NUMERIC(18, 4) NOT NULL DEFAULT 0,
    outflows_behavioural NUMERIC(18, 4) NOT NULL DEFAULT 0,
    net_gap_behavioural NUMERIC(18, 4) NOT NULL DEFAULT 0,
    cumulative_gap NUMERIC(18, 4) NOT NULL DEFAULT 0,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. WHOLESALE FUNDING FACILITIES & DEAL TICKETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS funding_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. FAC-PROVIDUS-RCF-01
    lender_name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(64) NOT NULL CHECK (facility_type IN (
        'REVOLVING_CREDIT', 'OVERDRAFT_LINE', 'STANDBY_LIQUIDITY', 'TERM_LOAN', 'INTERCOMPANY_LOAN'
    )),
    legal_entity VARCHAR(128) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    total_committed_limit NUMERIC(18, 4) NOT NULL,
    utilized_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
    available_undrawn NUMERIC(18, 4) NOT NULL,
    interest_rate_spread NUMERIC(6, 4) NOT NULL DEFAULT 0.0450, -- e.g. 4.5% + Benchmark
    maturity_date DATE NOT NULL,
    covenants_summary TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'EXPIRED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treasury_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_reference VARCHAR(64) UNIQUE NOT NULL, -- e.g. DEAL-2026-0904-0012
    facility_id UUID REFERENCES funding_facilities(id) ON DELETE SET NULL,
    deal_type VARCHAR(64) NOT NULL CHECK (deal_type IN (
        'FACILITY_DRAWDOWN', 'FACILITY_REPAYMENT', 'INTERCOMPANY_TRANSFER',
        'FX_SPOT_CONVERSION', 'NOSTRO_SWEEP', 'TERM_DEPOSIT'
    )),
    amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF', 'USD')),
    maker_id VARCHAR(128) NOT NULL,
    checker_id VARCHAR(128),
    approver_id VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'PROPOSED' CHECK (status IN (
        'PROPOSED', 'TREASURY_REVIEW', 'APPROVED', 'EXECUTED', 'SETTLED', 'RECONCILED', 'FAILED', 'CANCELLED'
    )),
    gl_journal_id UUID,
    value_date DATE NOT NULL,
    settlement_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. FINANCIAL BUDGETING & 3-STATEMENT PLANNING
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. FCST-2026-Q3-BASE
    version_name VARCHAR(64) NOT NULL, -- BASE_CASE, UPSIDE, DOWNSIDE, BOARD_PLAN
    horizon VARCHAR(32) NOT NULL CHECK (horizon IN ('1_MONTH', '3_MONTHS', '12_MONTHS', '36_MONTHS')),
    revenue_projected NUMERIC(18, 4) NOT NULL,
    direct_costs_projected NUMERIC(18, 4) NOT NULL,
    gross_margin_projected NUMERIC(18, 4) NOT NULL,
    operating_expenses_projected NUMERIC(18, 4) NOT NULL,
    funding_interest_expense NUMERIC(18, 4) NOT NULL DEFAULT 0,
    net_profit_projected NUMERIC(18, 4) NOT NULL,
    total_assets_projected NUMERIC(18, 4) NOT NULL,
    total_liabilities_projected NUMERIC(18, 4) NOT NULL,
    total_equity_projected NUMERIC(18, 4) NOT NULL,
    operating_cashflow_projected NUMERIC(18, 4) NOT NULL,
    ending_treasury_cash NUMERIC(18, 4) NOT NULL,
    created_by VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capital_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country VARCHAR(2) NOT NULL CHECK (country IN ('NG', 'NE')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'XOF')),
    paid_up_capital NUMERIC(18, 4) NOT NULL,
    retained_earnings NUMERIC(18, 4) NOT NULL,
    statutory_reserves NUMERIC(18, 4) NOT NULL,
    current_period_profit NUMERIC(18, 4) NOT NULL,
    total_qualifying_capital NUMERIC(18, 4) NOT NULL,
    regulatory_minimum_capital NUMERIC(18, 4) NOT NULL,
    capital_headroom NUMERIC(18, 4) NOT NULL,
    solvency_ratio_pct NUMERIC(6, 2) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. HIGH-PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_treasury_positions_book ON treasury_positions(book_id, currency);
CREATE INDEX IF NOT EXISTS idx_alm_maturity_currency ON alm_maturity_buckets(currency, bucket_code);
CREATE INDEX IF NOT EXISTS idx_funding_facilities_status ON funding_facilities(status, maturity_date);
CREATE INDEX IF NOT EXISTS idx_treasury_deals_status ON treasury_deals(status, value_date);
CREATE INDEX IF NOT EXISTS idx_financial_forecasts_version ON financial_forecasts(version_name, horizon);
