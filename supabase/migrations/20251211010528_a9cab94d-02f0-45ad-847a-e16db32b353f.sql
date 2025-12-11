-- Add options column to plan_variables for select/dropdown fields
ALTER TABLE public.plan_variables 
ADD COLUMN IF NOT EXISTS options text[] DEFAULT NULL;

-- Add description column to plan_variables
ALTER TABLE public.plan_variables 
ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;

-- Create webhook_endpoints table for future integrations
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  secret_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook_endpoints
CREATE POLICY "Authenticated users can view webhook_endpoints" 
ON public.webhook_endpoints 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert webhook_endpoints" 
ON public.webhook_endpoints 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update webhook_endpoints" 
ON public.webhook_endpoints 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete webhook_endpoints" 
ON public.webhook_endpoints 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_webhook_endpoints_updated_at
BEFORE UPDATE ON public.webhook_endpoints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for contracts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;