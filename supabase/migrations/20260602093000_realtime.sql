-- Add the admin-console tables to the supabase_realtime publication so the client can
-- subscribe to row changes (drives the topbar "Realtime" indicator + live invalidation).
alter publication supabase_realtime add table drivers;
alter publication supabase_realtime add table routes;
alter publication supabase_realtime add table promos;
alter publication supabase_realtime add table payouts;
alter publication supabase_realtime add table support_tickets;
alter publication supabase_realtime add table staff;
