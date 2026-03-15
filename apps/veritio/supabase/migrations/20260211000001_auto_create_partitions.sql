-- Phase 3: Partition management helper

CREATE OR REPLACE FUNCTION create_monthly_partitions(table_name text, months_ahead int DEFAULT 3)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  start_date date;
  end_date date;
  partition_name text;
  i int;
BEGIN
  FOR i IN 1..months_ahead LOOP
    start_date := date_trunc('month', NOW() + (i || ' months')::interval);
    end_date := start_date + interval '1 month';
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        table_name,
        start_date,
        end_date
      );
      RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
  END LOOP;
END;
$$;
