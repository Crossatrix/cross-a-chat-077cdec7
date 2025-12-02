-- Create table to track user warnings for false reports
CREATE TABLE public.user_warnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  warning_type text NOT NULL DEFAULT 'false_report',
  related_report_id uuid REFERENCES public.user_reports(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- Users can view their own warnings
CREATE POLICY "Users can view their own warnings"
  ON public.user_warnings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all warnings
CREATE POLICY "Admins can view all warnings"
  ON public.user_warnings
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert warnings (via service role)
CREATE POLICY "System can insert warnings"
  ON public.user_warnings
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_user_warnings_user_id ON public.user_warnings(user_id);
CREATE INDEX idx_user_warnings_created_at ON public.user_warnings(created_at DESC);

COMMENT ON TABLE public.user_warnings IS 'Tracks warnings issued to users for violations like false reports';
COMMENT ON COLUMN public.user_warnings.warning_type IS 'Type of warning: false_report, spam, etc.';
COMMENT ON COLUMN public.user_warnings.related_report_id IS 'The report that triggered this warning (if applicable)';