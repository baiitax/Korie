-- Aggregator staff notification preferences — the /aggregator/settings page
-- previously had an "Automated Network Alerts" toggle that only flipped
-- local React state and never persisted anywhere (a fake setTimeout
-- "Saved!" banner). This adds a real, server-owned column so the
-- preference actually persists and is honestly represented.
ALTER TABLE public.aggregator_staff_users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"lowFloatEmailAlerts": true, "lowFloatSmsAlerts": true}'::jsonb;
