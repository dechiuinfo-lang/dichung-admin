import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { makeBoard, matchPending, depart, complete, approve, addPending, onDemand } from './dispatchBoard.js';
import * as api from '../lib/dispatchApi.js';

// One hook, two implementations behind the same shape — like the rest of the app. The branch
// is on a module-constant (isSupabaseConfigured) so hook order is stable across renders.
//   returns { board:{trips,pending,drivers,stats}, pulse, onMatch, onNow, onDepart, onDone, onAppr, live }

function useMockBoard() {
  const [board, setBoard] = useState(() => makeBoard());
  const [pulse, setPulse] = useState(false);
  const flash = () => { setPulse(true); setTimeout(() => setPulse(false), 900); };
  useEffect(() => {
    const iv = setInterval(() => { setBoard((b) => addPending(b)); flash(); }, 7000);
    return () => clearInterval(iv);
  }, []);
  return {
    board, pulse, live: false,
    onMatch: () => setBoard((b) => matchPending(b)),
    onNow: () => setBoard((b) => onDemand(b)),
    onDepart: (id) => setBoard((b) => depart(b, id)),
    onDone: (id) => setBoard((b) => complete(b, id)),
    onAppr: (id) => setBoard((b) => approve(b, id)),
  };
}

function useLiveBoard() {
  const qc = useQueryClient();
  const tripsQ = useQuery({ queryKey: ['disp_trips'], queryFn: api.fetchDispatchTrips });
  const pendingQ = useQuery({ queryKey: ['disp_pending'], queryFn: api.fetchDispatchPending });
  const fleetQ = useQuery({ queryKey: ['disp_fleet'], queryFn: api.fetchFleet });
  const statsQ = useQuery({ queryKey: ['disp_stats'], queryFn: api.fetchDispatchStats });
  const [pulse, setPulse] = useState(false);

  const inv = () => ['disp_trips', 'disp_pending', 'disp_fleet', 'disp_stats']
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  // realtime: any change to trips/bookings/drivers refetches the board + flashes the dot
  useEffect(() => {
    const ch = supabase.channel('dispatch-db');
    ['trips', 'bookings', 'drivers'].forEach((table) => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        setPulse(true); setTimeout(() => setPulse(false), 900);
        inv();
      });
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]); // eslint-disable-line react-hooks/exhaustive-deps

  const trips = tripsQ.data || [];
  const pending = pendingQ.data || [];
  const drivers = (fleetQ.data || []).map((d) => api.mapFleet(d, trips));
  const board = {
    trips, pending, drivers,
    stats: {
      pending: pending.length,
      forming: trips.filter((t) => t.status === 'forming').length,
      enroute: trips.filter((t) => t.status === 'enroute').length,
      completed: statsQ.data?.completed ?? 0,
      revenue: statsQ.data?.revenue ?? 0,
    },
  };
  const wrap = (p) => Promise.resolve(p).then(inv).catch((e) => { console.error(e); inv(); });
  return {
    board, pulse, live: true,
    onMatch: () => wrap(api.runMatch()),
    onNow: () => wrap(api.addOnDemand()),
    onDepart: (id) => wrap(api.departTrip(id)),
    onDone: (id) => wrap(api.completeTrip(id)),
    onAppr: (id) => wrap(api.approveDriver(id)),
  };
}

export function useDispatchBoard() {
  return isSupabaseConfigured ? useLiveBoard() : useMockBoard(); // eslint-disable-line react-hooks/rules-of-hooks
}
