-- Add template_content column to plans for storing rich text template
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS template_content text;

-- Add client_token to contracts for client form links
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_token uuid DEFAULT gen_random_uuid();
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_filled_at timestamp with time zone;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_contracts_client_token ON public.contracts(client_token);

-- Create policy for public access via token (for client form)
CREATE POLICY "Anyone can view contract by token"
ON public.contracts
FOR SELECT
USING (client_token IS NOT NULL);

CREATE POLICY "Anyone can update contract by token"
ON public.contracts
FOR UPDATE
USING (client_token IS NOT NULL)
WITH CHECK (client_token IS NOT NULL);