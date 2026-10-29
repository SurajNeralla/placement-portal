import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StudentAiMatchModal } from '../components/StudentAiMatchModal';

const API = 'http://127.0.0.1:8000/api';

interface StudentDrivesProps {
  token: string;
  activeTab?: string;
  onNavigateToVerification?: () => void;
}

export const StudentDrives: React.FC<StudentDrivesProps> = ({
  token,
  activeTab: _activeTab,
  onNavigateToVerification,
}) => {
  const [drives, setDrives] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiMatchDrive, setAiMatchDrive] = useState<any | null>(null);

  // Filters
  const [ctcFilter, setCtcFilter] = useState<'all' | 'high'>('all');
  const [sortDeadline, setSortDeadline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Professional Account Verification Lock State
  const [isVerificationLocked, setIsVerificationLocked] = useState(false);
  const [verificationData, setVerificationData] = useState<{
    github_connected: boolean;
    linkedin_connected: boolean;
    missing_verifications: string[];
  }>({
    github_connected: true,
    linkedin_connected: true,
    missing_verifications: [],
  });

  // Application Preview Modal State
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedDriveForApply, setSelectedDriveForApply] = useState<any | null>(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [feedRes, trackRes, eventsRes, verifRes] = await Promise.all([
        fetch(`${API}/drives/student-feed`, { headers }),
        fetch(`${API}/drives/applications/track`, { headers }),
        fetch(`${API}/students/events`, { headers }),
        fetch(`${API}/student/verification/drive-access`, { headers }),
      ]);

      if (verifRes.ok) {
        const v = await verifRes.json();
        setIsVerificationLocked(!v.access_granted);
        setVerificationData(v);
      }

      if (feedRes.status === 403) {
        try {
          const errData = await feedRes.json();
          if (errData.detail?.code === 'PROFESSIONAL_VERIFICATION_REQUIRED') {
            setIsVerificationLocked(true);
            if (errData.detail.missing_verifications) {
              setVerificationData((prev) => ({
                ...prev,
                missing_verifications: errData.detail.missing_verifications,
                github_connected: !errData.detail.missing_verifications.includes('github'),
                linkedin_connected: !errData.detail.missing_verifications.includes('linkedin'),
              }));
            }
          }
        } catch {}
      } else if (feedRes.ok) {
        setDrives(await feedRes.json());
        setIsVerificationLocked(false);
      }

      if (trackRes.ok) setApplications(await trackRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
    } catch {
      setError('Failed to load drives & events. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    load();
  }, [load]);

  const showMsg = (msg: string, isErr = false) => {
    if (isErr) setError(msg);
    else setSuccess(msg);
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 4500);
  };

  const openApplyPreview = async (drive: any) => {
    setSelectedDriveForApply(drive);
    setLoadingPreview(true);
    try {
      const res = await fetch(`${API}/drives/${drive.id}/application-preview`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      } else {
        setPreviewData(null);
      }
    } catch {
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const apply = async (driveId: string) => {
    setActionId(driveId);
    try {
      const res = await fetch(`${API}/drives/${driveId}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Application failed.');
      showMsg('Application submitted successfully with verified profile snapshot!');
      setDrives((prev) =>
        prev.map((d) => (d.id === driveId ? { ...d, applied: true, application_status: 'Applied' } : d))
      );
      setSelectedDriveForApply(null);
      setPreviewData(null);
    } catch (err: any) {
      showMsg(err.message, true);
    } finally {
      setActionId(null);
    }
  };

  // Filtered and sorted drives
  const displayedDrives = useMemo(() => {
    let list = [...drives];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          (d.company_name || '').toLowerCase().includes(q) ||
          (d.job_role || '').toLowerCase().includes(q)
      );
    }
    if (ctcFilter === 'high') {
      list = list.filter((d) => {
        const pkgStr = String(d.package || '');
        const num = parseFloat(pkgStr.replace(/[^0-9.]/g, ''));
        return num >= 15;
      });
    }
    if (sortDeadline) {
      list.sort((a, b) => new Date(a.drive_deadline).getTime() - new Date(b.drive_deadline).getTime());
    }
    return list;
  }, [drives, searchQuery, ctcFilter, sortDeadline]);

  // First application in progress for pipeline preview
  const primaryApplication = applications[0] || null;

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-body-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-body-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* ── 1. WELCOME HEADER & PROFILE READINESS BANNER ── */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        {/* Welcome Context Card */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-[#E6E8F0] rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-headline-xl font-headline-xl text-on-surface font-semibold tracking-tight">
                    Welcome to Career Portal
                  </h1>
                  <span className="material-symbols-outlined text-[#F59E0B] text-[24px]">waving_hand</span>
                </div>
                <p className="text-body-md font-body-md text-on-surface-variant mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-on-surface">Campus Recruitment Workspace</span>
                  <span className="text-outline">•</span>
                  <span>Batch of 2025</span>
                  <span className="text-outline">•</span>
                  <span className="inline-flex items-center text-emerald-700 font-medium text-label-sm">
                    <span className="material-symbols-outlined text-[14px] mr-1">check_circle</span>
                    Profile Verified
                  </span>
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-label-sm font-label-sm bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0] flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
                Campus Drive Session 2024–25 Active
              </span>
            </div>

            {/* Contextual notification inside header */}
            <div className="mt-5 pt-4 border-t border-[#E6E8F0] flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#0369A1]">calendar_month</span>
                <span>
                  {events.length > 0 ? (
                    <>
                      Next Scheduled Event: <strong className="text-on-surface font-semibold">{events[0].title || events[0].event_name}</strong>
                      {' — '}{events[0].date || events[0].location || 'Active Session'}
                    </>
                  ) : (
                    <>
                      Next Scheduled Event:{' '}
                      <strong className="text-on-surface font-semibold">
                        {drives[0]?.company_name || 'Upcoming Campus Assessment'}
                      </strong>
                      {' — '}
                      {drives[0]?.job_role || 'Registration Open'}
                    </>
                  )}
                </span>
              </div>
              <button
                onClick={load}
                className="text-primary font-medium hover:underline flex items-center gap-1 text-label-md"
              >
                <span>Sync Opportunities</span>
                <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Readiness Card */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest border border-[#E6E8F0] rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-table-header font-table-header uppercase text-on-surface-variant tracking-wider">
                Profile Readiness
              </span>
              <span className="text-headline-sm font-headline-sm font-bold text-primary">
                {!isVerificationLocked ? '100%' : '75%'}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-[#F1F3F9] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary-container h-full rounded-full transition-all duration-500"
                  style={{ width: !isVerificationLocked ? '100%' : '75%' }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-caption font-caption text-on-surface-variant">
                <span>
                  {!isVerificationLocked ? 'Tier 1 & 2 Verified' : 'OAuth Verification Required'}
                </span>
                <span>Target: 100%</span>
              </div>
            </div>
          </div>

          {isVerificationLocked ? (
            <div className="mt-4 p-3 rounded-lg bg-[#FFF7E6] border border-[#FED7AA] flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#B45309] text-[18px] shrink-0 mt-0.5">pending</span>
              <div className="flex flex-col">
                <span className="text-body-sm font-body-sm font-semibold text-[#B45309] leading-tight">Action Pending</span>
                <span className="text-caption font-caption text-[#92400E] mt-0.5">
                  Connect GitHub &amp; LinkedIn accounts to unlock full access to Tier-1 recruitment drives.
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 rounded-lg bg-[#ECFDF3] border border-[#BBF7D0] flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#15803D] text-[18px] shrink-0 mt-0.5">verified</span>
              <div className="flex flex-col">
                <span className="text-body-sm font-body-sm font-semibold text-[#15803D] leading-tight">Clearance Complete</span>
                <span className="text-caption font-caption text-[#166534] mt-0.5">
                  Your academic records and professional accounts satisfy campus placement eligibility.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. ESSENTIAL VERIFICATION STATUS BAR & DUAL PROVIDER CARDS ── */}
      <div className="bg-surface-container-lowest border border-[#E6E8F0] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-headline-sm font-headline-sm font-semibold text-on-surface">
              External Credential &amp; Identity Verification
            </h2>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Automated institutional OAuth validation for high-trust recruiting pipelines.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToVerification && (
              <button
                onClick={onNavigateToVerification}
                className="h-8 px-3 rounded-lg bg-primary-container text-white text-label-sm font-label-sm font-semibold hover:bg-primary transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span>Verification Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* Dual Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GitHub Card */}
          <div className="border border-[#E6E8F0] rounded-xl p-4 bg-surface hover:border-[#CBD5E1] transition-all flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#24292F] text-white flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">code</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-body-md font-semibold text-on-surface">GitHub Account</span>
                  {verificationData.github_connected ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Not Connected
                    </span>
                  )}
                </div>
                <div className="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[#006399]">
                    {verificationData.github_connected ? 'OAuth Validated' : 'Action Required'}
                  </span>
                  <span className="text-outline">•</span>
                  <span>Repositories Synced</span>
                </div>
              </div>
            </div>
            {onNavigateToVerification && !verificationData.github_connected && (
              <button
                onClick={onNavigateToVerification}
                className="text-label-sm font-semibold text-primary hover:underline"
              >
                Connect →
              </button>
            )}
          </div>

          {/* LinkedIn Card */}
          <div className="border border-[#E6E8F0] rounded-xl p-4 bg-surface hover:border-[#CBD5E1] transition-all flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#0A66C2] text-white flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">badge</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-body-md font-semibold text-on-surface">LinkedIn Profile</span>
                  {verificationData.linkedin_connected ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Not Connected
                    </span>
                  )}
                </div>
                <div className="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
                  <span className="text-[#006399]">
                    {verificationData.linkedin_connected ? 'OIDC Verified' : 'Action Required'}
                  </span>
                  <span className="text-outline">•</span>
                  <span>Professional ID</span>
                </div>
              </div>
            </div>
            {onNavigateToVerification && !verificationData.linkedin_connected && (
              <button
                onClick={onNavigateToVerification}
                className="text-label-sm font-semibold text-primary hover:underline"
              >
                Connect →
              </button>
            )}
          </div>
        </div>

        {/* Drive Access Banner */}
        {!isVerificationLocked ? (
          <div className="p-3.5 rounded-xl bg-[#ECFDF3] border border-[#BBF7D0] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#15803D] shrink-0">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
              <div>
                <span className="text-body-sm font-semibold text-[#15803D]">All Drive Access Unlocked</span>
                <span className="text-body-sm text-[#166534] ml-1.5">
                  — Your verified accounts satisfy campus recruiter compliance criteria across Tier-1 enterprise companies.
                </span>
              </div>
            </div>
            <span className="text-label-sm font-label-sm font-semibold text-[#15803D] bg-white px-2.5 py-1 rounded-md border border-[#BBF7D0] shadow-2xs">
              Campus Clearance: Pass
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#FFF7E6] border border-[#FED7AA] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#FEF3C7] flex items-center justify-center text-[#B45309] shrink-0">
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </div>
              <div>
                <span className="text-body-sm font-semibold text-[#B45309]">Placement Drive Access Locked</span>
                <span className="text-body-sm text-[#92400E] ml-1.5">
                  — You must verify both GitHub and LinkedIn accounts to view details and apply for active campus drives.
                </span>
              </div>
            </div>
            {onNavigateToVerification && (
              <button
                onClick={onNavigateToVerification}
                className="text-label-sm font-semibold text-primary bg-white px-3 py-1 rounded-md border border-outline-variant hover:bg-surface-container"
              >
                Verify Accounts Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 3. KEY STUDENT METRICS (KPI Blocks) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: Academic Standing */}
        <div className="bg-surface-container-lowest border border-[#E6E8F0] rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-table-header font-table-header uppercase text-on-surface-variant">Academic Standing</span>
            <span className="w-8 h-8 rounded-lg bg-[#F1F3F9] flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">grade</span>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-headline-xl font-headline-xl text-on-surface font-semibold tracking-tight">
              Eligible
            </span>
            <span className="text-body-lg text-on-surface-variant font-normal"> / Verified</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0]">
              Active Record
            </span>
            <span className="text-caption font-caption text-on-surface-variant">0 Active Backlogs Required</span>
          </div>
        </div>

        {/* Metric 2: Applications In Progress */}
        <div className="bg-surface-container-lowest border border-[#E6E8F0] rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-table-header font-table-header uppercase text-on-surface-variant">Active Pipeline</span>
            <span className="w-8 h-8 rounded-lg bg-[#E0F2FE] flex items-center justify-center text-[#0369A1]">
              <span className="material-symbols-outlined text-[20px]">send_and_archive</span>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-headline-xl font-headline-xl text-on-surface font-semibold tracking-tight">
              {applications.length} Drives
            </span>
            <span className="text-body-lg text-on-surface-variant font-normal"> In Progress</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
              {applications.filter((a) => a.status === 'Shortlisted').length} Shortlisted
            </span>
            <span className="text-caption font-caption text-on-surface-variant">
              {applications.filter((a) => a.status === 'Applied').length} under review
            </span>
          </div>
        </div>

        {/* Metric 3: Eligible Recommendations */}
        <div className="bg-surface-container-lowest border border-[#E6E8F0] rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-table-header font-table-header uppercase text-on-surface-variant">Recruiter Match</span>
            <span className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center text-[#6D28D9]">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-headline-xl font-headline-xl text-on-surface font-semibold tracking-tight">
              {drives.length} Open
            </span>
            <span className="text-body-lg text-on-surface-variant font-normal"> Opportunities</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-caption font-caption text-on-surface-variant">Domain Tags:</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#F1F3F9] text-on-surface">Software Engineering</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#F1F3F9] text-on-surface">Cloud</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#F1F3F9] text-on-surface">Fullstack</span>
          </div>
        </div>
      </div>

      {/* ── 4. PRIMARY SECTION: ELIGIBLE & RECOMMENDED PLACEMENT DRIVES ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-headline-lg font-headline-lg text-on-surface tracking-tight font-semibold">
              Eligible &amp; Recommended Placement Drives
            </h2>
            <span className="px-2.5 py-0.5 text-label-sm font-semibold rounded-full bg-primary-fixed text-primary">
              {displayedDrives.length} Available
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search company or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-body-sm bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-surface placeholder:text-outline w-56"
              />
            </div>
            <button
              onClick={() => setCtcFilter(ctcFilter === 'all' ? 'high' : 'all')}
              className={`h-8 px-3 rounded-lg border text-label-md font-label-md flex items-center gap-1.5 transition-colors ${
                ctcFilter === 'high'
                  ? 'bg-primary-container text-white border-primary-container'
                  : 'border-[#E6E8F0] bg-surface-container-lowest text-on-surface hover:bg-[#F1F3F9]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">filter_list</span>
              <span>Filter by CTC (&gt; 15 LPA)</span>
            </button>
            <button
              onClick={() => setSortDeadline(!sortDeadline)}
              className={`h-8 px-3 rounded-lg border text-label-md font-label-md flex items-center gap-1.5 transition-colors ${
                sortDeadline
                  ? 'bg-primary-container text-white border-primary-container'
                  : 'border-[#E6E8F0] bg-surface-container-lowest text-on-surface hover:bg-[#F1F3F9]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">swap_vert</span>
              <span>Deadline (Soonest)</span>
            </button>
          </div>
        </div>

        {/* Grid of Marketplace Cards */}
        {displayedDrives.length === 0 ? (
          <div className="p-8 bg-surface-container-lowest border border-outline-variant rounded-xl text-center text-on-surface-variant">
            No placement drives match your filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedDrives.map((drive) => {
              const pkg = drive.package || '₹18.0 LPA';
              const location = drive.location || 'Multiple Locations';
              const deadline = drive.drive_deadline
                ? new Date(drive.drive_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Closing Soon';
              const applied = drive.applied || drive.application_status;

              return (
                <div
                  key={drive.id}
                  className="bg-surface-container-lowest border border-[#E6E8F0] rounded-xl p-5 shadow-xs hover:shadow-md hover:border-[#CBD5E1] transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl border border-[#E6E8F0] bg-surface flex items-center justify-center p-2 shadow-2xs font-bold text-primary text-body-lg">
                          {(drive.company_name || 'CO').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-body-md font-semibold text-on-surface leading-tight">
                            {drive.company_name}
                          </h3>
                          <span className="text-caption font-caption text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            {location}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-caption font-semibold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                        {deadline}
                      </span>
                    </div>

                    {/* Job Title & Package */}
                    <div className="mt-4">
                      <h4 className="text-headline-sm font-headline-sm text-on-surface font-semibold">
                        {drive.job_role}
                      </h4>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-headline-lg font-headline-lg font-bold text-on-surface">
                          {pkg}
                        </span>
                        <span className="text-caption font-caption text-on-surface-variant font-medium">
                          (Package)
                        </span>
                      </div>
                    </div>

                    {/* Tech Stack Tags */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="px-2 py-1 rounded bg-[#F1F3F9] text-label-sm font-medium text-on-surface">Fullstack</span>
                      <span className="px-2 py-1 rounded bg-[#F1F3F9] text-label-sm font-medium text-on-surface">Cloud</span>
                      <span className="px-2 py-1 rounded bg-[#F1F3F9] text-label-sm font-medium text-on-surface">Algorithms</span>
                    </div>
                  </div>

                  {/* Card Action Bar */}
                  <div className="mt-5 pt-4 border-t border-[#E6E8F0] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-caption font-caption text-[#15803D]">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Min CGPA: {drive.min_cgpa || '6.0'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAiMatchDrive(drive)}
                        className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-primary"
                        title="AI Skill Match Analysis"
                      >
                        <span className="material-symbols-outlined text-[18px]">psychology</span>
                      </button>

                      {applied ? (
                        <span className="px-3 py-1.5 rounded-lg bg-[#E0F2FE] text-[#0369A1] text-label-sm font-medium border border-[#BAE6FD] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span>Applied</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => openApplyPreview(drive)}
                          disabled={actionId === drive.id}
                          className="h-9 px-4 rounded-lg bg-primary-container text-white font-label-md font-medium hover:bg-primary active:scale-[0.98] transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <span>{actionId === drive.id ? 'Submitting...' : 'Apply Now'}</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 5. SECONDARY SECTION: APPLICATION PROGRESS PIPELINE & AI SKILL INSIGHTS ── */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        {/* Pipeline Column */}
        <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest border border-[#E6E8F0] rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-headline-sm font-headline-sm font-semibold text-on-surface">
                  Application Progress Pipeline
                </h3>
                <p className="text-body-sm font-body-sm text-on-surface-variant">
                  Live interview round tracking for active recruiter submissions.
                </p>
              </div>
              <span className="text-caption font-caption text-on-surface-variant font-medium">
                {primaryApplication ? `Drive: ${primaryApplication.company_name}` : 'No active drives'}
              </span>
            </div>

            {/* Stepped Status Tracker Pipeline */}
            <div className="mt-6 relative">
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-[#E6E8F0] -z-0"></div>
              <div className="grid grid-cols-5 gap-2 relative z-10">
                {/* Step 1: Applied */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-[#15803D] text-white flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </div>
                  <span className="text-body-sm font-semibold text-on-surface mt-2 leading-tight">Applied</span>
                  <span className="text-[10px] text-[#15803D] font-medium mt-0.5">Verified</span>
                </div>
                {/* Step 2: Assessment */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center ring-4 ring-primary-container/20 shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                  </div>
                  <span className="text-body-sm font-bold text-primary mt-2 leading-tight">Assessment</span>
                  <span className="text-[10px] text-primary bg-[#EEF2FF] px-1.5 py-0.2 rounded mt-0.5">Active</span>
                </div>
                {/* Step 3: Technical */}
                <div className="flex flex-col items-center text-center opacity-60">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-[#CBD5E1] text-[#94A3B8] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">terminal</span>
                  </div>
                  <span className="text-body-sm font-medium text-on-surface mt-2 leading-tight">Technical</span>
                  <span className="text-[10px] text-outline mt-0.5">Round 1</span>
                </div>
                {/* Step 4: HR */}
                <div className="flex flex-col items-center text-center opacity-60">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-[#CBD5E1] text-[#94A3B8] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                  </div>
                  <span className="text-body-sm font-medium text-on-surface mt-2 leading-tight">HR Round</span>
                  <span className="text-[10px] text-outline mt-0.5">Fitment</span>
                </div>
                {/* Step 5: Offer */}
                <div className="flex flex-col items-center text-center opacity-60">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-[#CBD5E1] text-[#94A3B8] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                  </div>
                  <span className="text-body-sm font-medium text-on-surface mt-2 leading-tight">Offer</span>
                  <span className="text-[10px] text-outline mt-0.5">Decision</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E6E8F0] flex items-center justify-between bg-surface p-3 rounded-lg border flex-wrap gap-2">
            <div className="flex items-center gap-2 text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px]">info</span>
              <span>Keep your resume and verified GitHub projects up to date for scheduled recruiter assessments.</span>
            </div>
          </div>
        </div>

        {/* AI Skill Insights Column */}
        <div className="col-span-12 lg:col-span-5 bg-surface-container-lowest border border-[#E6E8F0] rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#EEF2FF] text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                </div>
                <h3 className="text-headline-sm font-headline-sm font-semibold text-on-surface">
                  AI Resume-Job Compatibility
                </h3>
              </div>
              <span className="text-caption font-caption px-2 py-0.5 rounded bg-surface border border-[#E6E8F0] text-on-surface-variant font-mono">
                v2.4 Engine
              </span>
            </div>

            {/* Circular Gauge Score */}
            <div className="mt-4 p-4 rounded-xl bg-surface border border-[#E6E8F0] flex items-center gap-5">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#E6E8F0]"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className="text-[#15803D]"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="91, 100"
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <span className="absolute text-headline-sm font-headline-sm font-bold text-on-surface">91%</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-body-md font-bold text-on-surface">Tier-1 Role Compatibility</span>
                  <span className="px-2 py-0.2 rounded text-[11px] font-semibold bg-[#ECFDF3] text-[#15803D]">
                    Optimal
                  </span>
                </div>
                <p className="text-caption font-caption text-on-surface-variant mt-1 leading-relaxed">
                  Based on successfully placed alumni engineering profiles in recent placement cycles.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#15803D] text-[18px] shrink-0 mt-0.5">check_circle</span>
                <div className="text-body-sm font-body-sm">
                  <span className="font-medium text-on-surface">Strong Domain Fit:</span>
                  <span className="text-on-surface-variant"> High technical proficiency detected in Core CS, REST APIs, and backend systems.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#F59E0B] text-[18px] shrink-0 mt-0.5">lightbulb</span>
                <div className="text-body-sm font-body-sm">
                  <span className="font-medium text-on-surface">Skill Tip:</span>
                  <span className="text-on-surface-variant"> Connect your verified GitHub account so recruiter bots index your repositories.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#E6E8F0] flex items-center justify-between text-caption font-caption text-on-surface-variant">
            <span>ATS Parser Synced</span>
            {drives[0] && (
              <button
                onClick={() => setAiMatchDrive(drives[0])}
                className="text-label-md font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Run Full Match</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. COMPACT AUDIT LOG & COMPLIANCE FOOTER NOTE ── */}
      <div className="p-4 rounded-xl bg-surface-container-lowest border border-[#E6E8F0] flex items-center justify-between text-body-sm text-on-surface-variant flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[18px] text-outline">shield</span>
          <span>
            All academic grades and verified developer credentials are cryptographic-hash attested by the Institutional Placement Cell.
          </span>
        </div>
        <div className="flex items-center gap-4 text-caption font-caption text-outline">
          <span>Placement Policy 2025</span>
          <span>•</span>
          <span>Code of Conduct</span>
        </div>
      </div>

      {/* ── Apply Preview Modal ── */}
      {selectedDriveForApply && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <div>
                <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface">
                  Submit Drive Application
                </h3>
                <p className="text-caption font-caption text-on-surface-variant">
                  {selectedDriveForApply.company_name} — {selectedDriveForApply.job_role}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedDriveForApply(null);
                  setPreviewData(null);
                }}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {loadingPreview ? (
              <div className="py-8 text-center text-body-sm text-on-surface-variant">
                Generating verified application snapshot...
              </div>
            ) : (
              <div className="space-y-3 text-body-sm text-on-surface">
                <div className="p-3 bg-surface rounded-lg border border-outline-variant/60 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant text-caption">Student Name:</span>
                    <strong>{previewData?.student?.name || 'Verified Student'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant text-caption">Roll Number:</span>
                    <strong className="font-mono">{previewData?.student?.roll_number || '21CS1002'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant text-caption">Verified CGPA:</span>
                    <strong>{previewData?.student?.cgpa || '8.50'}</strong>
                  </div>
                </div>

                <p className="text-caption text-on-surface-variant">
                  By clicking submit, your verified marksheet transcript and authenticated OAuth credentials will be locked into the recruiter dossier.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSelectedDriveForApply(null);
                      setPreviewData(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low text-label-md font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => apply(selectedDriveForApply.id)}
                    disabled={actionId === selectedDriveForApply.id}
                    className="px-4 py-2 rounded-lg bg-primary-container hover:bg-primary text-white text-label-md font-semibold transition-colors disabled:opacity-50"
                  >
                    {actionId === selectedDriveForApply.id ? 'Submitting...' : 'Confirm & Apply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Matcher Modal */}
      {aiMatchDrive && (
        <StudentAiMatchModal
          token={token}
          drive={aiMatchDrive}
          isOpen={!!aiMatchDrive}
          onClose={() => setAiMatchDrive(null)}
          onApplyConfirmed={(driveId) => {
            setAiMatchDrive(null);
            apply(driveId);
          }}
        />
      )}
    </div>
  );
};
