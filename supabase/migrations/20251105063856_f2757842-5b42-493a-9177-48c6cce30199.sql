-- Create AI bot profile with a proper username
INSERT INTO public.profiles (id, username)
VALUES ('00000000-0000-0000-0000-000000000000', 'CrossChatAI')
ON CONFLICT (id) DO NOTHING;

-- Assign user role to AI bot
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'user')
ON CONFLICT (user_id, role) DO NOTHING;