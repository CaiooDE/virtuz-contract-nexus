-- Create enum for contract status
CREATE TYPE public.contract_status AS ENUM (
  'draft',
  'sent_to_client',
  'awaiting_signature',
  'active',
  'expired',
  'cancelled'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  template_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create plan_variables table
CREATE TABLE public.plan_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  variable_name TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT DEFAULT 'text' NOT NULL,
  required BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  status contract_status DEFAULT 'draft' NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_value DECIMAL(10, 2),
  total_value DECIMAL(10, 2) NOT NULL,
  custom_data JSONB DEFAULT '{}',
  generated_document_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for plans (all authenticated users can view/manage)
CREATE POLICY "Authenticated users can view plans"
  ON public.plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert plans"
  ON public.plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update plans"
  ON public.plans FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete plans"
  ON public.plans FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for plan_variables
CREATE POLICY "Authenticated users can view plan_variables"
  ON public.plan_variables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert plan_variables"
  ON public.plan_variables FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update plan_variables"
  ON public.plan_variables FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete plan_variables"
  ON public.plan_variables FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for contracts
CREATE POLICY "Authenticated users can view contracts"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contracts"
  ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts"
  ON public.contracts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete contracts"
  ON public.contracts FOR DELETE
  TO authenticated
  USING (true);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_domain TEXT;
BEGIN
  -- Extract domain from email
  user_domain := split_part(NEW.email, '@', 2);
  
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, domain)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    user_domain
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for templates
INSERT INTO storage.buckets (id, name, public) VALUES ('templates', 'templates', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', true);

-- Storage policies for templates bucket
CREATE POLICY "Authenticated users can upload templates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'templates');

CREATE POLICY "Anyone can view templates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'templates');

CREATE POLICY "Authenticated users can delete templates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'templates');

-- Storage policies for contracts bucket
CREATE POLICY "Authenticated users can upload contracts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can view contracts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can delete contracts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'contracts');