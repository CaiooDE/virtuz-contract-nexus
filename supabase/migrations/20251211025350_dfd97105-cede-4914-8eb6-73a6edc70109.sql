-- Add contract category field (tipo/motivo do contrato)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS contract_category TEXT DEFAULT 'client';

-- Add check constraint for valid categories
ALTER TABLE public.contracts 
ADD CONSTRAINT check_contract_category 
CHECK (contract_category IN ('client', 'service_provider_pj', 'service_provider_pf', 'vendor_service', 'partnership', 'other'));

-- Add comment to explain the field
COMMENT ON COLUMN public.contracts.contract_category IS 'Category/type of contract: client, service_provider_pj, service_provider_pf, vendor_service, partnership, other';