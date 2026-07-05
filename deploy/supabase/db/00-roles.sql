\set pgpass `echo "$POSTGRES_PASSWORD"`

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS;
  END IF;
END
$$;

ALTER ROLE supabase_admin WITH PASSWORD :'pgpass';
ALTER ROLE supabase_admin WITH SUPERUSER;
GRANT supabase_admin TO postgres;
