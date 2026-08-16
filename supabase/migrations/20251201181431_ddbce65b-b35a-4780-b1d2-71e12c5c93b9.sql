-- Add AI moderation columns to user_reports table
ALTER TABLE user_reports
ADD COLUMN ai_reviewed boolean DEFAULT false,
ADD COLUMN ai_verdict text,
ADD COLUMN ai_reason text,
ADD COLUMN ai_reviewed_at timestamp with time zone;

-- Create index for AI review queries
CREATE INDEX idx_user_reports_ai_reviewed ON user_reports(ai_reviewed);
CREATE INDEX idx_user_reports_status ON user_reports(status);