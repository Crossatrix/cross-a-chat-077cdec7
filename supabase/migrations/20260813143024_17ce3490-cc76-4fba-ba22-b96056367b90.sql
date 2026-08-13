CREATE TABLE public.support_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid REFERENCES public.support_pages(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.support_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_pages TO authenticated;
GRANT ALL ON public.support_pages TO service_role;

ALTER TABLE public.support_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read support pages"
ON public.support_pages FOR SELECT
USING (true);

CREATE POLICY "Admins can insert support pages"
ON public.support_pages FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update support pages"
ON public.support_pages FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete support pages"
ON public.support_pages FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_support_pages_updated_at
BEFORE UPDATE ON public.support_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_support_pages_parent ON public.support_pages(parent_id, sort_order);

-- Seed starter content
WITH c1 AS (
  INSERT INTO public.support_pages (title, content, sort_order)
  VALUES ('Getting help', 'Cross Chat support is here to help. You can email us at cross.a.trix.chat@hotmail.com, send in-app feedback, or ask the AI Assistant on the support page.', 0)
  RETURNING id
), c2 AS (
  INSERT INTO public.support_pages (title, content, sort_order)
  VALUES ('Common questions', 'Answers to the questions we get asked most often.', 1)
  RETURNING id
), c3 AS (
  INSERT INTO public.support_pages (title, content, sort_order)
  VALUES ('Reporting content', 'Use the report button on any message, post or video. Reports go straight to our staff team, who can remove content or block the account.', 2)
  RETURNING id
)
INSERT INTO public.support_pages (parent_id, title, content, sort_order)
SELECT c1.id, 'Contacting support', 'Email cross.a.trix.chat@hotmail.com with your username and a short description of the problem. We usually reply within a few days.', 0 FROM c1
UNION ALL
SELECT c1.id, 'Sending feedback', 'Open Support and use the Send feedback button to report a bug or suggest a feature. Staff replies appear inside the app.', 1 FROM c1
UNION ALL
SELECT c2.id, 'I cannot post videos, posts or comments', 'Your account may be temporarily blocked by staff. Blocks expire automatically; permanent blocks can be appealed by email.', 0 FROM c2
UNION ALL
SELECT c2.id, 'My Croins or Pro/Beta purchase did not apply', 'Reload the app first. If it still does not show up in Settings, Pro tab, contact us with your username.', 1 FROM c2
UNION ALL
SELECT c2.id, 'A mod broke my app', 'Open the Mods menu and disable or uninstall the mod. Mods rated Risky or High Risk can affect stability.', 2 FROM c2
UNION ALL
SELECT c2.id, 'I forgot my password', 'Cross Chat uses your Crossatrix account. Reset your password there and sign in again.', 3 FROM c2
UNION ALL
SELECT c3.id, 'What happens after a report', 'Every staff member sees the report in the admin panel. They can delete the content or block the poster temporarily or permanently.', 0 FROM c3;