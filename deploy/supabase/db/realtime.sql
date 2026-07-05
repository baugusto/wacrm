\set pguser `echo "$POSTGRES_USER"`

create schema if not exists _realtime;
alter schema _realtime owner to :pguser;
grant usage, create on schema _realtime to supabase_admin;

create schema if not exists realtime;
alter schema realtime owner to supabase_admin;
grant usage, create on schema realtime to supabase_admin;
