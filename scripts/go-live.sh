#!/usr/bin/env bash
# go-live.sh — connect ĐiChung to a hosted Supabase project and deploy the backend.
#
# One-time prerequisite (interactive, your account):  npx supabase login
# Then:                                               scripts/go-live.sh <project-ref>
#
# This automates everything the CLI can do non-interactively (link + migrations + edge
# function). Two steps need your project's secrets, so they're printed for you to paste.
set -euo pipefail

REF="${1:-}"
if [ -z "$REF" ]; then
  echo "Usage: scripts/go-live.sh <project-ref>   (find it at supabase.com → Project Settings → General)"
  exit 1
fi

if ! npx supabase projects list >/dev/null 2>&1; then
  echo "✗ Not logged in. Run:  npx supabase login   then re-run this script."
  exit 1
fi

echo "▶ Linking to project $REF…"
npx supabase link --project-ref "$REF"

echo "▶ Pushing migrations (schema + RLS + auth hook + matching)…"
npx supabase db push

echo "▶ Deploying edge function match-trip…"
npx supabase functions deploy match-trip --project-ref "$REF"

cat <<EOF

✅ Database + edge function are live on $REF.

Three steps remain (they need this project's secret keys, from
supabase.com → Project Settings → API):

1) Enable the role hook + phone login (Dashboard):
   • Authentication → Hooks → "Customize Access Token (JWT) Claims"
       → enable, function: public.custom_access_token_hook
   • Authentication → Providers → Phone → enable an SMS provider
     (or add test numbers under Auth → "Test OTP").

2) Configure the matching auto-trigger (Dashboard → SQL Editor), with the SERVICE ROLE key:
   insert into app_config(key,value) values
     ('match_trip_url','https://$REF.supabase.co/functions/v1/match-trip'),
     ('match_trip_key','<SERVICE_ROLE key>')
   on conflict (key) do update set value = excluded.value;

3) Point the deployed frontend at this project, then redeploy:
   gh variable set VITE_SUPABASE_URL      --body 'https://$REF.supabase.co'
   gh variable set VITE_SUPABASE_ANON_KEY --body '<anon / publishable key>'
   git commit --allow-empty -m 'rebuild: go live' && git push   # triggers a live Pages build

Done → https://dechiuinfo-lang.github.io/dichung-admin/ runs against real Supabase
(phone-OTP login, RLS, realtime, match-trip).
EOF
