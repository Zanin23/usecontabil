-- Enable RLS on realtime.messages and restrict channel subscriptions
-- to channels named "session:<user_id>" matching the subscriber's auth.uid().
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to their own session channel" ON realtime.messages;
CREATE POLICY "Users can subscribe to their own session channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('session:' || auth.uid()::text)
);