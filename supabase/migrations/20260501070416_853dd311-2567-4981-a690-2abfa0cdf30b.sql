CREATE TABLE public.render_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  input_path TEXT,
  output_path TEXT,
  recipe JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  worker_job_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own render jobs"
ON public.render_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users create own render jobs"
ON public.render_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_render_jobs_updated_at
BEFORE UPDATE ON public.render_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_render_jobs_user ON public.render_jobs(user_id, created_at DESC);