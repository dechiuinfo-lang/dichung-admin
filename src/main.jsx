import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminApp from './App.jsx';
import Login from './components/Login.jsx';
import { DataProvider } from './store.jsx';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

// In Supabase mode, require a signed-in staff member before mounting the console
// (and its data queries). In mock mode this passes straight through.
function Gate({ children }) {
  const { mode, loading, session, isStaff, role, signOut } = useAuth();
  if (mode === 'mock') return children;
  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontWeight: 600 }}>Đang tải…</div>;
  }
  if (!session) return <Login />;
  if (!isStaff) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Không có quyền truy cập</div>
          <div style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16 }}>Tài khoản (vai trò: {role || '—'}) không thuộc nhóm quản trị.</div>
          <button onClick={signOut} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '9px 16px', background: 'var(--card)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Đăng xuất</button>
        </div>
      </div>
    );
  }
  return children;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Gate>
          <DataProvider>
            <AdminApp />
          </DataProvider>
        </Gate>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
