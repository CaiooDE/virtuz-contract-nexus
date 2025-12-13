-- Add columns for Autentique integration
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS autentique_document_id TEXT,
ADD COLUMN IF NOT EXISTS autentique_signature_link TEXT,
ADD COLUMN IF NOT EXISTS sent_to_autentique_at TIMESTAMP WITH TIME ZONE;