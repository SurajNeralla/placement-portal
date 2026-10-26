import React, { useState, useRef, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:8000/api';

interface LoginProps {
  onLoginSuccess: (authData: {
    token: string;
    role: string;
    institutionId: string;
    userId: string;
    userName: string;
  }) => void;
  onNavigateRegister?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [step, setStep] = useState<'login' | 'otp' | 'set_password'>('login');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'otp' && otpRefs.current[0]) {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.detail && data.detail.includes("Password not set")) {
          // Trigger OTP flow for first-time login
          setMessage("You don't have a password yet. Sending an OTP...");
          await handleRequestOtp(e, true);
          return;
        }
        throw new Error(data.detail || 'Login failed');
      }

      onLoginSuccess({
        token: data.access_token,
        role: data.role,
        institutionId: data.institution_id,
        userId: data.user_id,
        userName: data.user_name,
      });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent, skipValidation = false) => {
    e.preventDefault();
    if (!email && !skipValidation) return;

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to request OTP');
      }

      setMessage(data.message || 'OTP sent successfully!');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value && !/^\d+$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    const fullOtp = newOtp.join('');
    if (fullOtp.length === 6) handleVerifyOtp(fullOtp);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const [tempAuthData, setTempAuthData] = useState<any>(null);

  const handleVerifyOtp = async (otpCode: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || 'Verification failed');

      // Check if password setup is required (first-time login for any role)
      if (data.requires_password_setup) {
        setTempAuthData(data);
        setStep('set_password');
        setMessage('Welcome! Please set a password for future logins.');
      } else {
        onLoginSuccess({
          token: data.access_token,
          role: data.role,
          institutionId: data.institution_id,
          userId: data.user_id,
          userName: data.user_name,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Invalid code.');
      setOtp(Array(6).fill(''));
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !tempAuthData) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tempAuthData.access_token}` },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to set password');
      
      onLoginSuccess({
        token: tempAuthData.access_token,
        role: tempAuthData.role,
        institutionId: tempAuthData.institution_id,
        userId: tempAuthData.user_id,
        userName: tempAuthData.user_name,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to set password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role: string) => {
    let testEmail = '';
    let testPassword = '';
    
    if (role === 'Dean') {
      testEmail = 'test@gvpcdpgc.edu.in';
      testPassword = 'dean123';
    } else if (role === 'TPO') {
      testEmail = 'tpo@gvpcdpgc.edu.in';
      testPassword = 'tpo123';
    } else if (role === 'Faculty') {
      testEmail = 'faculty@gvpcdpgc.edu.in';
      testPassword = 'faculty123';
    } else if (role === 'Student') {
      testEmail = '5241411095@gvpcdpgc.edu.in';
      testPassword = 'suraj2007';
    }
    
    setEmail(testEmail);
    setPassword(testPassword);
    
    // Attempt login if password logic exists for the role
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword, remember_me: rememberMe }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.detail && data.detail.includes("Password not set")) {
          setMessage(`Simulating OTP request for ${testEmail}...`);
          const otpRes = await fetch(`${API_BASE}/auth/otp/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail }),
          });
          if (otpRes.ok) {
            setMessage('OTP Sent. Since this is Quick Login, please enter any digits or check your mock OTP log.');
            setStep('otp');
          }
          return;
        }
        throw new Error(data.detail || 'Login failed');
      }

      onLoginSuccess({
        token: data.access_token,
        role: data.role,
        institutionId: data.institution_id,
        userId: data.user_id,
        userName: data.user_name,
      });
    } catch (err: any) {
      setError(`Quick Login failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-background font-body-md text-on-background selection:bg-primary-container/30">
      {/* Left Side: Visual/Branding Section */}
      <section className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden bg-surface-container-lowest items-center justify-center p-xl">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,#dbe1ff_0%,transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,#dae2fd_0%,transparent_50%)]"></div>
        </div>
        <div className="relative z-10 w-full max-w-2xl text-center">
          <div className="mb-xl inline-flex items-center gap-sm animate-fade-in">
            <img src="/logo.png" alt="PlacementHub Logo" className="h-[80px] object-contain" />
          </div>
          <div className="relative group animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[2rem] blur-xl opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative overflow-hidden rounded-[2rem] border border-outline-variant bg-white clerk-shadow aspect-[4/3] flex items-center justify-center animate-float">
              <img 
                className="object-cover w-full h-full" 
                alt="Digital illustration for corporate career platform" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCouIHM16rDi1eWzzHntRRk7BivUHixJv3YP2kt_FhzpLgUmntAt_sUmfCkbUBZfNsTUJb5TFGkJrAQQsCo_QJC88zS6_5LgxwAAjSps0iOaNP1gwPLGgDzt66lGuPa1DYPY7IkvJdCWDuTJwqt26SgE1DRUJeACiSVnio8jpBtc9wn4g7sywdSu0pFMPeU8IOsFJEwHaZTuBjHHYwQjKnG5CGe3bj__PRMF6eO481LvcO49aQoQLQbrfGVQUbH6X-wgV0v8avwLhqe" 
              />
            </div>
          </div>
          <div className="mt-xl space-y-md">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Empowering the next generation of talent.</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mx-auto">The enterprise-grade platform for campus placements, student tracking, and corporate relations.</p>
          </div>
        </div>
      </section>

      {/* Right Side: Login Section */}
      <section className="flex-1 flex flex-col justify-center items-center p-md md:p-2xl bg-background">
        <div className="md:hidden mb-xl flex items-center justify-center animate-fade-in">
          <img src="/logo.png" alt="PlacementHub Logo" className="h-[80px] object-contain" />
        </div>
        
        <div className="w-full max-w-[420px] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-clerk clerk-shadow p-xl space-y-xl">
            <header className="space-y-xs">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Sign in to your account</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Enter your details to access the portal.</p>
            </header>

            {error && <div className="p-sm bg-error-container text-on-error-container rounded-lg text-sm text-center">{error}</div>}
            {message && <div className="p-sm bg-tertiary-fixed text-on-tertiary-fixed rounded-lg text-sm text-center">{message}</div>}

            {step === 'login' && (
              <form className="space-y-lg" onSubmit={handleLogin}>
                <div className="space-y-md">
                  <div className="space-y-xs">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="email">Institution Email</label>
                    <div className="relative group input-halo transition-all duration-200 rounded-lg">
                      <input 
                        className="w-full h-11 px-md rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:ring-0 transition-colors outline-none" 
                        id="email" 
                        placeholder="name@institution.edu" 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-xs">
                    <div className="flex justify-between items-center">
                      <label className="font-label-md text-label-md text-on-surface" htmlFor="password">Password</label>
                    </div>
                    <div className="relative group input-halo transition-all duration-200 rounded-lg">
                      <input 
                        className="w-full h-11 px-md rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:ring-0 transition-colors outline-none" 
                        id="password" 
                        placeholder="••••••••" 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-sm">
                    <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4" />
                    <label htmlFor="rememberMe" className="text-body-sm text-on-surface-variant">Remember Me</label>
                  </div>
                </div>
                
                <button 
                  className="w-full h-11 bg-primary text-on-primary rounded-lg font-label-md text-label-md font-semibold btn-hover clerk-shadow disabled:opacity-50" 
                  type="submit"
                  disabled={isLoading || !email || !password}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>

                <div className="flex justify-between items-center mt-sm px-1">
                  <button type="button" onClick={(e) => handleRequestOtp(e, false)} className="text-sm font-semibold text-primary hover:underline disabled:opacity-50" disabled={isLoading || !email}>
                    Login with OTP
                  </button>
                  {onNavigateRegister && (
                    <button type="button" onClick={onNavigateRegister} className="text-sm font-semibold text-primary hover:underline disabled:opacity-50" disabled={isLoading}>
                      New Student? Register
                    </button>
                  )}
                </div>
                
                <div className="relative py-xs">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline-variant"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-surface-container-lowest px-md font-label-md text-label-md text-on-surface-variant">OR TEST QUICK LOGIN</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-sm">
                  {['Dean', 'TPO', 'Faculty', 'Student'].map((role) => (
                    <button 
                      key={role}
                      type="button" 
                      onClick={() => handleQuickLogin(role)}
                      className="h-9 border border-outline-variant bg-surface-container-lowest text-on-surface rounded-lg font-label-md text-label-md font-medium hover:bg-surface-container-low transition-all"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </form>
            )}

            {step === 'otp' && (
              <div className="space-y-lg">
                <div className="space-y-xs text-center">
                  <label className="font-label-md text-label-md text-on-surface">Enter Verification Code</label>
                  <p className="text-body-sm text-on-surface-variant">Sent to {email}</p>
                </div>
                
                <div className="flex justify-between gap-sm mt-4">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-outline-variant focus:border-primary outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest text-on-surface transition-all"
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, i)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      disabled={isLoading}
                    />
                  ))}
                </div>

                <div className="flex justify-between items-center mt-6">
                  <button 
                    type="button" 
                    className="text-label-md text-on-surface-variant hover:text-on-surface"
                    onClick={() => { setStep('login'); setOtp(Array(6).fill('')); setError(null); }}
                  >
                    ← Back
                  </button>
                  <button 
                    type="button" 
                    className="text-label-md text-primary hover:underline font-semibold"
                    onClick={(e) => handleRequestOtp(e, false)}
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}

            {step === 'set_password' && (() => {
              const pwLen = newPassword.length;
              const hasNum = /[0-9]/.test(newPassword);
              const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
              let strength: 'weak' | 'fair' | 'strong' = 'weak';
              if (pwLen >= 10 && hasSpecial) strength = 'strong';
              else if (pwLen >= 6) strength = 'fair';
              const strengthConfig = {
                weak:   { color: '#EF4444', label: 'Weak',   width: '33%' },
                fair:   { color: '#F59E0B', label: 'Fair',   width: '66%' },
                strong: { color: '#10B981', label: 'Strong', width: '100%' },
              };
              const sc = strengthConfig[strength];
              return (
                <form className="space-y-lg" onSubmit={handleSetPassword}>
                  <div className="space-y-md">
                    <div className="space-y-xs">
                      <label className="font-label-md text-label-md text-on-surface">New Password</label>
                      <div className="relative group input-halo transition-all duration-200 rounded-lg">
                        <input 
                          className="w-full h-11 px-md rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:ring-0 transition-colors outline-none" 
                          placeholder="Set a strong password" 
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={isLoading}
                          required 
                        />
                      </div>
                      {newPassword.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: sc.width, background: sc.color, borderRadius: 99, transition: 'all 0.35s ease' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span style={{ fontSize: '0.75rem', color: sc.color, fontWeight: 700 }}>{sc.label}</span>
                            <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                              {strength === 'weak' ? 'Use 6+ chars' : strength === 'fair' ? 'Add special char for Strong' : '✓ Great password!'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    className="w-full h-11 bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center btn-hover disabled:opacity-50 disabled:cursor-not-allowed" 
                    type="submit"
                    disabled={isLoading || newPassword.length < 6}
                  >
                    {isLoading ? 'Saving...' : 'Save & Continue'}
                  </button>
                </form>
              );
            })()}

            <footer className="pt-md border-t border-outline-variant">
              <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
                New to PlacementHub? <a className="text-primary font-medium hover:underline" href="#">Create Institution</a>
              </p>
            </footer>
          </div>

          <div className="mt-xl flex flex-col items-center gap-md">
            {/* ── Quick Login / Dev Actions ── */}
            <div className="flex flex-wrap justify-center gap-2 mb-4 bg-surface-container-low p-3 rounded-lg border border-outline-variant">
              <span className="text-label-sm font-semibold text-on-surface-variant mr-2 flex items-center">Quick Login:</span>
              <button 
                type="button"
                onClick={() => { setEmail('dean@cbit.ac.in'); setPassword('Password123!'); }}
                className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-colors"
              >
                Dean
              </button>
              <button 
                type="button"
                onClick={() => { setEmail('tpo@cbit.ac.in'); setPassword('Password123!'); }}
                className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-colors"
              >
                TPO
              </button>
              <button 
                type="button"
                onClick={() => { setEmail('faculty1@cbit.ac.in'); setPassword('Password123!'); }}
                className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-colors"
              >
                Faculty
              </button>
              <button 
                type="button"
                onClick={() => { setEmail('5241411095@gvpcdpgc.edu.in'); setPassword('suraj2007'); }}
                className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-colors"
              >
                Student
              </button>
            </div>

            <div className="flex justify-center gap-lg">
              <a className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">Privacy Policy</a>
              <a className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">Terms of Service</a>
              <a className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">Help Center</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
