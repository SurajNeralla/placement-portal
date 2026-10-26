import { useState, useEffect, useRef, useCallback } from 'react';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { DeanDashboard } from './pages/DeanDashboard';
import { TpoDashboard } from './pages/TpoDashboard';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { StudentProfile } from './pages/StudentProfile';
import { StudentDrives } from './pages/StudentDrives';
import { UserProfile } from './pages/UserProfile';
import { Sidebar } from './components/Sidebar';
import { NotificationsPanel } from './components/NotificationsPanel';
import { LogoutIcon, UserIcon } from './components/Icons';

interface AuthState {
  token: string;
  role: 'Dean' | 'TPO' | 'Faculty' | 'Student';
  institutionId: string;
  userId: string;
  userName: string;
}

const TIMEOUT_MINUTES = 30;
const WARNING_SECONDS = 120;

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [view, setView] = useState<'login' | 'onboard' | 'dashboard' | 'profile'>('login');
  const [currentTab, setCurrentTab] = useState<string>('drives');
  const [sessionWarning, setSessionWarning] = useState<number | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<number>(WARNING_SECONDS);

  // Ensure window title and enforce light theme across all logins
  useEffect(() => {
    document.title = 'PlacementHub - Placement Portal';
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.removeItem('darkMode');
    document.documentElement.style.setProperty('--bg-main', '#F8FAFC');
    document.documentElement.style.setProperty('--bg-surface', '#FFFFFF');
    document.documentElement.style.setProperty('--text-primary', '#0F172A');
    document.documentElement.style.setProperty('--text-secondary', '#64748B');
    document.documentElement.style.setProperty('--border-color', '#E2E8F0');
  }, []);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearInterval(warningRef.current);
    setSessionWarning(null);
    countdownRef.current = WARNING_SECONDS;
  }, []);

  const handleLogout = useCallback(() => {
    clearTimers();
    localStorage.removeItem('auth');
    setAuth(null);
    setView('login');
  }, [clearTimers]);

  const startWarningCountdown = useCallback(() => {
    countdownRef.current = WARNING_SECONDS;
    setSessionWarning(WARNING_SECONDS);
    warningRef.current = setInterval(() => {
      countdownRef.current -= 1;
      setSessionWarning(countdownRef.current);
      if (countdownRef.current <= 0) {
        handleLogout();
      }
    }, 1000);
  }, [handleLogout]);

  const resetTimeout = useCallback(() => {
    if (!auth) return;
    clearTimers();
    timeoutRef.current = setTimeout(startWarningCountdown, (TIMEOUT_MINUTES - WARNING_SECONDS / 60) * 60 * 1000);
  }, [auth, clearTimers, startWarningCountdown]);

  // Restore auth from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAuth(parsed);
        setView('dashboard');
        if (parsed.role === 'Dean') setCurrentTab('overview');
        else if (parsed.role === 'TPO') setCurrentTab('drives');
        else if (parsed.role === 'Faculty') setCurrentTab('reviews');
        else if (parsed.role === 'Student') setCurrentTab('profile');
      } catch {
        localStorage.removeItem('auth');
      }
    }
  }, []);

  useEffect(() => {
    if (!auth) { clearTimers(); return; }
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
    const handler = () => { if (sessionWarning === null) resetTimeout(); };
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimeout();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearTimers();
    };
  }, [auth, resetTimeout, clearTimers, sessionWarning]);

  const handleLoginSuccess = (data: { token: string; role: string; institutionId: string; userId: string; userName: string }) => {
    const state: AuthState = {
      token: data.token,
      role: data.role as any,
      institutionId: data.institutionId,
      userId: data.userId,
      userName: data.userName
    };
    setAuth(state);
    localStorage.setItem('auth', JSON.stringify(state));
    setView('dashboard');
    if (state.role === 'Dean') setCurrentTab('overview');
    else if (state.role === 'TPO') setCurrentTab('drives');
    else if (state.role === 'Faculty') setCurrentTab('reviews');
    else if (state.role === 'Student') setCurrentTab('profile');
  };

  if (!auth) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', transition: 'background 0.3s' }}>
        {view === 'login' && (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onNavigateOnboard={() => setView('onboard')}
          />
        )}
        {view === 'onboard' && (
          <Onboarding
            onSuccess={() => setView('login')}
            onBackToLogin={() => setView('login')}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-main)', transition: 'background 0.3s' }}>
      {/* ── LEFT SIDEBAR NAVIGATION (MATCHING IMAGE 0) ── */}
      <Sidebar
        role={auth.role}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentView={view === 'profile' ? 'profile' : 'dashboard'}
        onViewChange={v => setView(v === 'profile' ? 'profile' : 'dashboard')}
        userName={auth.userName}
      />

      {/* ── RIGHT MAIN CANVAS & HEADER BAR ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        {/* Upper Top Header Bar */}
        <header
          style={{
            height: 56,
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          {/* Left: Quick Omnibar Search */}
          <div style={{ display: 'flex', alignItems: 'center', width: 340, position: 'relative' }}>
            <span
              className="material-symbols-outlined"
              style={{ position: 'absolute', left: 10, fontSize: 18, color: '#94A3B8' }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search roll no, company, student... (⌘K)"
              style={{
                width: '100%',
                height: 34,
                paddingLeft: 34,
                paddingRight: 40,
                fontSize: '0.8rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                outline: 'none',
                color: '#0F172A',
              }}
            />
            <kbd
              style={{
                position: 'absolute',
                right: 8,
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                padding: '2px 5px',
                fontFamily: 'monospace',
              }}
            >
              ⌘K
            </kbd>
          </div>

          {/* Right: Notifications, Actions & Profile Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Notifications Panel */}
            <NotificationsPanel token={auth.token} />

            {/* User Profile Dropdown Pill */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  background: '#F8FAFC',
                  padding: '4px 12px 4px 6px',
                  borderRadius: 20,
                  border: '1px solid #E2E8F0',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                  }}
                >
                  {auth.userName ? auth.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                </div>
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>
                    {auth.userName || 'User'}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 1 }}>
                    {auth.role}
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#94A3B8', marginLeft: 4 }}>
                  {isProfileDropdownOpen ? '▲' : '▼'}
                </span>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileDropdownOpen && (
                <>
                  <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                    onClick={() => setIsProfileDropdownOpen(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: 240,
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 14,
                      boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                      zIndex: 999,
                      padding: '8px 0',
                    }}
                  >
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {auth.userName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        Role: {auth.role}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setView('profile');
                        setIsProfileDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-main)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <UserIcon size={16} color="var(--text-secondary)" />
                      Account Profile
                    </button>

                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <LogoutIcon size={16} color="#EF4444" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Session Warning Toast */}
        {sessionWarning !== null && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0B192C',
              color: '#fff',
              padding: '14px 24px',
              borderRadius: 12,
              zIndex: 9999,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            <span>Session expires in <strong>{sessionWarning}s</strong> due to inactivity.</span>
            <button
              onClick={resetTimeout}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Stay Logged In
            </button>
          </div>
        )}

        {/* Dashboard Content Area */}
        <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {view === 'profile' ? (
              <div className="animate-fade-in">
                <UserProfile token={auth.token} />
              </div>
            ) : (
              <>
                {auth.role === 'Dean' && (
                  <div className="animate-fade-in">
                    <DeanDashboard token={auth.token} institutionId={auth.institutionId} userName={auth.userName} activeTab={currentTab} setActiveTab={setCurrentTab} />
                  </div>
                )}
                {auth.role === 'TPO' && (
                  <div className="animate-fade-in">
                    <TpoDashboard token={auth.token} institutionId={auth.institutionId} activeTab={currentTab} setActiveTab={setCurrentTab} />
                  </div>
                )}
                {auth.role === 'Faculty' && (
                  <div className="animate-fade-in">
                    <FacultyDashboard token={auth.token} activeTab={currentTab} setActiveTab={setCurrentTab} />
                  </div>
                )}
                {auth.role === 'Student' && (
                  <div className="animate-fade-in">
                    {currentTab === 'profile' && (
                      <StudentProfile
                        token={auth.token}
                        initialTab="basic"
                        onNavigateToDrives={() => setCurrentTab('drives')}
                      />
                    )}
                    {currentTab === 'verification' && (
                      <StudentProfile
                        token={auth.token}
                        initialTab="verification"
                        onNavigateToDrives={() => setCurrentTab('drives')}
                      />
                    )}
                    {currentTab === 'drives' && (
                      <StudentDrives
                        token={auth.token}
                        activeTab="drives"
                        onNavigateToVerification={() => setCurrentTab('verification')}
                      />
                    )}
                    {currentTab === 'events' && (
                      <StudentDrives
                        token={auth.token}
                        activeTab="events"
                        onNavigateToVerification={() => setCurrentTab('verification')}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Footer Line (Matching Image 0) */}
        <footer
          style={{
            textAlign: 'center',
            padding: '16px 24px',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          Developed by: Md. Mohasin, M. Mihir Vijhval, N. Sairam Suraj, N. Pravallika Ratna Priya
        </footer>
      </div>
    </div>
  );
}

