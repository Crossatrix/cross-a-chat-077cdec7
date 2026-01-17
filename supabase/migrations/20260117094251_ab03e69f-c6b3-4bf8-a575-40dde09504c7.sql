-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create device verification settings table
CREATE TABLE public.device_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    verification_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create device verification codes table
CREATE TABLE public.device_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    code TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trusted devices table
CREATE TABLE public.trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, device_fingerprint)
);

-- Enable RLS on all tables
ALTER TABLE public.device_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- RLS policies for device_verification
CREATE POLICY "Users can view their own device verification settings"
ON public.device_verification FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device verification settings"
ON public.device_verification FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device verification settings"
ON public.device_verification FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for device_verification_codes
CREATE POLICY "Users can view their own verification codes"
ON public.device_verification_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification codes"
ON public.device_verification_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification codes"
ON public.device_verification_codes FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for trusted_devices
CREATE POLICY "Users can view their own trusted devices"
ON public.trusted_devices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trusted devices"
ON public.trusted_devices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trusted devices"
ON public.trusted_devices FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own trusted devices"
ON public.trusted_devices FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updating updated_at
CREATE TRIGGER update_device_verification_updated_at
BEFORE UPDATE ON public.device_verification
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();