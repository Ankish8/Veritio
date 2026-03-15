-- Add lightweight ping RPC function for health checks
-- This bypasses RLS and connection overhead for faster health monitoring

CREATE OR REPLACE FUNCTION ping()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 'pong'::TEXT;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION ping() TO service_role;
GRANT EXECUTE ON FUNCTION ping() TO anon;
GRANT EXECUTE ON FUNCTION ping() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION ping() IS 'Lightweight health check function that returns "pong". Used by Motia backend health monitoring to verify database connectivity without RLS overhead.';
