-- Role-in-JWT: a custom access token hook copies profiles.role into a `user_role`
-- claim on every issued JWT, so RLS can check role with no extra query.
--
-- NOTE: we use the claim name `user_role` (not `role`) deliberately — Supabase
-- reserves the top-level `role` claim for the Postgres role (anon/authenticated),
-- so clobbering it would break the connection. The backend doc's example wrote
-- `auth.jwt()->>'role'`; this is the safe equivalent via the auth_role() helper.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_role text;
begin
  select role::text into v_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(v_role, 'customer')));
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- the auth server runs the hook as supabase_auth_admin → it needs to read profiles
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on table public.profiles to supabase_auth_admin;

revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- RLS helper: current request's role from the JWT claim (defaults to 'customer')
create or replace function public.auth_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', ''),
    'customer'
  );
$$;

-- true for back-office roles that the Admin Console / Dispatch use
create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select public.auth_role() in ('admin', 'accountant', 'dispatch', 'cskh');
$$;
