import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { DeanDashboard } from './pages/DeanDashboard';
import { TpoDashboard } from './pages/TpoDashboard';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { StudentProfile } from './pages/StudentProfile';
import { StudentDrives } from './pages/StudentDrives';
import { UserProfile } from './pages/UserProfile';
import { NotificationsPanel } from './components/NotificationsPanel';

interface AuthState {
  token: string;
  role: string;
  institutionId: string;
  userId: string;
  userName: string;
}

const TIMEOUT_MINUTES = 30;
const WARNING_SECONDS = 120;

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [view, setView] = useState<'login' | 'register' | 'onboard' | 'dashboard' | 'profile'>('login');
  const [studentTab, setStudentTab] = useState<'profile' | 'drives'>('profile');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [sessionWarning, setSessionWarning] = useState<number | null>(null); // countdown seconds
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<number>(WARNING_SECONDS);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', String(darkMode));
    if (darkMode) {
      document.documentElement.style.setProperty('--bg-main', '#0F172A');
      document.documentElement.style.setProperty('--bg-surface', '#1E293B');
      document.documentElement.style.setProperty('--text-primary', '#F1F5F9');
      document.documentElement.style.setProperty('--text-secondary', '#94A3B8');
      document.documentElement.style.setProperty('--border-color', 'rgba(255,255,255,0.08)');
    } else {
      document.documentElement.style.setProperty('--bg-main', '#F8FAFC');
      document.documentElement.style.setProperty('--bg-surface', '#FFFFFF');
      document.documentElement.style.setProperty('--text-primary', '#0F172A');
      document.documentElement.style.setProperty('--text-secondary', '#64748B');
      document.documentElement.style.setProperty('--border-color', 'rgba(0,0,0,0.08)');
    }
  }, [darkMode]);

  // Restore auth from localStorage
  useEffect(() => {
    const t = localStorage.getItem('token');
    const r = localStorage.getItem('role');
    const i = localStorage.getItem('institutionId');
    const u = localStorage.getItem('userId');
    const n = localStorage.getItem('userName');
    if (t && r && i && u && n) setAuth({ token: t, role: r, institutionId: i, userId: u, userName: n });
  }, []);

  // Session timeout management
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearInterval(warningRef.current);
    setSessionWarning(null);
    countdownRef.current = WARNING_SECONDS;
  }, []);

  const startWarningCountdown = useCallback(() => {
    countdownRef.current = WARNING_SECONDS;
    setSessionWarning(WARNING_SECONDS);
    warningRef.current = setInterval(() => {
      countdownRef.current -= 1;
      setSessionWarning(countdownRef.current);
      if (countdownRef.current <= 0) {
        clearTimers();
        handleLogout();
      }
    }, 1000);
  }, []);

  const resetTimeout = useCallback(() => {
    if (!auth) return;
    clearTimers();
    timeoutRef.current = setTimeout(startWarningCountdown, (TIMEOUT_MINUTES - WARNING_SECONDS / 60) * 60 * 1000);
  }, [auth, clearTimers, startWarningCountdown]);

  useEffect(() => {
    if (!auth) { clearTimers(); return; }
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
    const handler = () => resetTimeout();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimeout();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearTimers();
    };
  }, [auth, resetTimeout, clearTimers]);

  const handleLoginSuccess = (authData: AuthState) => {
    localStorage.setItem('token', authData.token);
    localStorage.setItem('role', authData.role);
    localStorage.setItem('institutionId', authData.institutionId);
    localStorage.setItem('userId', authData.userId);
    localStorage.setItem('userName', authData.userName);
    setAuth(authData);
    setView('dashboard');
  };

  const handleLogout = () => {
    clearTimers();
    ['token', 'role', 'institutionId', 'userId', 'userName'].forEach(k => localStorage.removeItem(k));
    setAuth(null);
    setView('login');
  };

  const handleOnboardSuccess = () => {
    alert("Institution successfully onboarded! You can now log in using the Dean's email.");
    setView('login');
  };

  const roleBadgeColor = (role: string) =>
    role === 'Dean' ? '#7C3AED' : role === 'TPO' ? '#3B82F6' : role === 'Faculty' ? '#10B981' : '#F59E0B';

  if (!auth) {
    return (
      <div style={styles.appContainer}>
        {view === 'login' && (
          <>
            <Login 
              onLoginSuccess={handleLoginSuccess} 
              onNavigateRegister={() => setView('register')}
            />
            <div style={styles.switchViewLink}>
              Don't have an institution registered?{' '}
              <button onClick={() => setView('onboard')} style={styles.linkButton}>Register Institution Here</button>
            </div>
          </>
        )}
        
        {view === 'register' && (
          <Register onBackToLogin={() => setView('login')} />
        )}
        
        {view === 'onboard' && (
          <>
            <Onboarding onSuccess={handleOnboardSuccess} />
            <div style={styles.switchViewLink}>
              Already registered?{' '}
              <button onClick={() => setView('login')} style={styles.linkButton}>Back to Login</button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (view === 'login' || view === 'onboard') {
    setView('dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', transition: 'background 0.3s' }}>

      {/* ── Session Warning Toast ── */}
      {sessionWarning !== null && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#7C3AED', color: '#fff', padding: '14px 24px', borderRadius: 12,
          zIndex: 9999, boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
          display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.9rem', fontWeight: 600
        }}>
          <span>⏱️ Session expires in <strong>{sessionWarning}s</strong> due to inactivity.</span>
          <button onClick={resetTimeout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
            Stay Logged In
          </button>
        </div>
      )}

      {/* ── Top Header ── */}
      <header style={styles.dashboardHeader}>
        <div style={styles.navBrand}>
          <img src="/logo.png" alt="PlacementHub Logo" style={{ height: '55px', objectFit: 'contain' }} />
        </div>

        {/* Student nav pills - hidden on mobile */}
        {auth.role === 'Student' && (
          <div style={{ ...styles.studentPills, display: 'none' }} className="student-pills-desktop">
            <button onClick={() => setStudentTab('profile')} style={{ ...styles.pill, ...(studentTab === 'profile' ? styles.pillActive : {}) }}>
              👤 Profile
            </button>
            <button onClick={() => setStudentTab('drives')} style={{ ...styles.pill, ...(studentTab === 'drives' ? styles.pillActive : {}) }}>
              💼 Drives
            </button>
          </div>
        )}

        {auth.role === 'Student' && (
          <div style={styles.studentPills} className="student-pills-shown">
            <button onClick={() => setStudentTab('profile')} style={{ ...styles.pill, ...(studentTab === 'profile' ? styles.pillActive : {}) }}>
              👤 Profile
            </button>
            <button onClick={() => setStudentTab('drives')} style={{ ...styles.pill, ...(studentTab === 'drives' ? styles.pillActive : {}) }}>
              💼 Drives
            </button>
          </div>
        )}

        <div style={styles.userInfo}>
          {/* Notifications for all roles */}
          <NotificationsPanel token={auth.token} />

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: 10, padding: '7px 12px', cursor: 'pointer',
              fontSize: '1.1rem', lineHeight: 1, transition: 'all 0.2s',
              color: darkMode ? '#F1F5F9' : '#374151',
            }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Profile / Dashboard toggle */}
          <button
            onClick={() => setView(view === 'profile' ? 'dashboard' : 'profile')}
            style={{
              ...styles.pill,
              background: view === 'profile' ? 'rgba(79,70,229,0.1)' : 'transparent',
              color: view === 'profile' ? '#4F46E5' : 'var(--text-secondary)',
              display: 'none'
            }}
            className="profile-btn-desktop"
          >
            {view === 'profile' ? 'Dashboard' : 'Profile'}
          </button>
          <button
            onClick={() => setView(view === 'profile' ? 'dashboard' : 'profile')}
            style={{ ...styles.pill, background: view === 'profile' ? 'rgba(79,70,229,0.1)' : 'transparent', color: view === 'profile' ? '#4F46E5' : 'var(--text-secondary)' }}
          >
            {view === 'profile' ? '⬅ Back' : '👤'}
          </button>

          {/* User info — hide on small screens */}
          <span style={{ ...styles.userName, display: 'none' }} className="username-desktop">{auth.userName}</span>
          <span style={{ ...styles.roleBadge, backgroundColor: roleBadgeColor(auth.role) }}>{auth.role}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, padding: '32px 24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {view === 'profile' ? (
            <div className="animate-fade-in">
              <UserProfile token={auth.token} />
            </div>
          ) : (
            <>
              {auth.role === 'Dean' && (
                <div className="animate-fade-in">
                  <DeanDashboard token={auth.token} institutionId={auth.institutionId} userName={auth.userName} />
                </div>
              )}
              {auth.role === 'TPO' && (
                <div className="animate-fade-in">
                  <TpoDashboard token={auth.token} institutionId={auth.institutionId} />
                </div>
              )}
              {auth.role === 'Faculty' && (
                <div className="animate-fade-in">
                  <FacultyDashboard token={auth.token} />
                </div>
              )}
              {auth.role === 'Student' && (
                <div className="animate-fade-in">
                  {studentTab === 'profile' ? <StudentProfile token={auth.token} /> : <StudentDrives token={auth.token} />}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Mobile Bottom Nav for Students ── */}
      {auth.role === 'Student' && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-around', padding: '10px 0',
          zIndex: 50, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)'
        }} className="mobile-bottom-nav">
          <button onClick={() => { setStudentTab('profile'); setView('dashboard'); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: studentTab === 'profile' && view === 'dashboard' ? '#4F46E5' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.72rem' }}>
            <span style={{ fontSize: '1.4rem' }}>👤</span>Profile
          </button>
          <button onClick={() => { setStudentTab('drives'); setView('dashboard'); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: studentTab === 'drives' && view === 'dashboard' ? '#4F46E5' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.72rem' }}>
            <span style={{ fontSize: '1.4rem' }}>💼</span>Drives
          </button>
          <button onClick={() => setView(view === 'profile' ? 'dashboard' : 'profile')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: view === 'profile' ? '#4F46E5' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.72rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⚙️</span>Settings
          </button>
        </nav>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  switchViewLink: { marginTop: 24, color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500, textAlign: 'center' },
  linkButton: { background: 'none', border: 'none', color: '#4F46E5', fontWeight: 600, cursor: 'pointer', marginLeft: 4 },
  dashboardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 32px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)',
    backdropFilter: 'blur(24px)', position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexWrap: 'wrap', gap: 8,
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  studentPills: { display: 'flex', gap: 6, background: 'rgba(15,23,42,0.04)', padding: 6, borderRadius: 12 },
  pill: { background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap' },
  pillActive: { background: '#FFFFFF', color: '#4F46E5', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  userName: { fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 700 },
  roleBadge: { padding: '4px 12px', borderRadius: 24, fontSize: '0.73rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' },
  logoutBtn: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, whiteSpace: 'nowrap' },
};
