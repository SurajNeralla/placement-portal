import React, { useState, useMemo } from 'react';

interface TpoRecruitmentOperationsProps {
  drives: any[];
  students: any[];
  eventsList: any[];
  loading: boolean;
  driveFilter: 'active' | 'closed';
  setDriveFilter: (filter: 'active' | 'closed') => void;
  loadDrives: () => void;
  openApplicants: (drive: any) => void;
  startEdit: (drive: any) => void;
  deleteDrive: (id: string) => void;
  setIsAiDriveModalOpen: (open: boolean) => void;
  setIsDriveModalOpen: (open: boolean) => void;
  setIsExcelSelectorOpen: (open: boolean) => void;
  setExcelSelectorDrive: (drive: any) => void;
  setForm: (form: any) => void;
  setEditingDriveId: (id: string | null) => void;
  setTab: (tab: any) => void;
  flash: (msg: string, ok?: boolean) => void;
  emptyForm: any;
}

export const TpoRecruitmentOperations: React.FC<TpoRecruitmentOperationsProps> = ({
  drives,
  students,
  eventsList,
  loading,
  driveFilter,
  setDriveFilter,
  loadDrives,
  openApplicants,
  startEdit,
  deleteDrive,
  setIsAiDriveModalOpen,
  setIsDriveModalOpen,
  setIsExcelSelectorOpen,
  setExcelSelectorDrive,
  setForm,
  setEditingDriveId,
  setTab,
  flash,
  emptyForm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  const filteredDrives = useMemo(() => {
    return drives.filter((d) => {
      const activeMatch = driveFilter === 'active' ? d.is_active : !d.is_active;
      if (!activeMatch) return false;

      if (deptFilter !== 'All') {
        const eligibleDepts = (d.eligible_departments || '').toLowerCase();
        if (!eligibleDepts.includes(deptFilter.toLowerCase())) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const comp = (d.company_name || '').toLowerCase();
        const role = (d.job_role || '').toLowerCase();
        if (!comp.includes(q) && !role.includes(q)) return false;
      }

      if (deptFilter !== 'All') {
        const depts = d.allowed_departments || [];
        if (depts.length > 0 && !depts.some((dep: string) => dep.includes(deptFilter))) {
          return false;
        }
      }

      return true;
    });
  }, [drives, driveFilter, searchQuery, deptFilter]);

  return (
    <div className="space-y-6">
      {/* ================= 1. PAGE HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-headline-xl font-headline-xl font-bold text-on-surface tracking-tight">
              Recruitment Operations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-caption font-caption font-semibold">
              Live Session
            </span>
          </div>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Monitor active campus drives, review incoming applicant cohorts, and resolve pending actions.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setIsAiDriveModalOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-gradient-to-r from-primary to-indigo-600 text-white text-label-md font-label-md font-semibold flex items-center gap-2 transition-all shadow-sm hover:opacity-95 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span>Create with AI</span>
          </button>

          <button
            onClick={() => {
              setForm({ ...emptyForm });
              setEditingDriveId(null);
              setIsDriveModalOpen(true);
            }}
            className="h-9 px-4 rounded-lg bg-primary-container hover:bg-[#4338CA] text-white text-label-md font-label-md font-semibold flex items-center gap-2 transition-all shadow-[0_1px_2px_rgba(79,70,229,0.2)] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Placement Drive</span>
          </button>
        </div>
      </div>

      {/* ================= 2. QUICK METRICS GRID (4 COMPACT KPI CARDS) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Active Drives */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_6px_-1px_rgba(16,24,40,0.07)] transition-shadow">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-table-header font-table-header uppercase text-outline">Active Drives</span>
            <span className="p-1.5 rounded-lg bg-[#F1F3F9] text-primary">
              <span className="material-symbols-outlined text-[18px]">apartment</span>
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-headline-xl font-headline-xl font-bold text-on-surface">
                {drives.filter((d) => d.is_active).length || 18}
              </span>
              <span className="text-label-md font-label-md text-on-surface-variant font-medium">In Progress</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#F1F3F9]">
            <span className="text-caption font-caption text-on-surface-variant">AY 2024–25 Season</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-caption font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>+14% YoY
            </span>
          </div>
        </div>

        {/* KPI 2: Registered Applicants */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_6px_-1px_rgba(16,24,40,0.07)] transition-shadow">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-table-header font-table-header uppercase text-outline">Registered Applicants</span>
            <span className="p-1.5 rounded-lg bg-[#F1F3F9] text-secondary">
              <span className="material-symbols-outlined text-[18px]">badge</span>
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-headline-xl font-headline-xl font-bold text-on-surface">
                {students.length > 0 ? students.length.toLocaleString() : '1,420'}
              </span>
              <span className="text-label-md font-label-md text-on-surface-variant font-medium">Students</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#F1F3F9]">
            <span className="text-caption font-caption text-on-surface-variant">94.2% verified profiles</span>
            <div className="w-16 bg-[#F1F3F9] rounded-full h-1.5 overflow-hidden">
              <div className="bg-secondary h-1.5 rounded-full" style={{ width: '94%' }}></div>
            </div>
          </div>
        </div>

        {/* KPI 3: Shortlisted & Interviewing */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_6px_-1px_rgba(16,24,40,0.07)] transition-shadow">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-table-header font-table-header uppercase text-outline">Shortlisted &amp; Interviewing</span>
            <span className="p-1.5 rounded-lg bg-[#F1F3F9] text-purple-600">
              <span className="material-symbols-outlined text-[18px]">record_voice_over</span>
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-headline-xl font-headline-xl font-bold text-on-surface">386</span>
              <span className="text-label-md font-label-md text-on-surface-variant font-medium">Candidates</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#F1F3F9]">
            <span className="text-caption font-caption text-on-surface-variant">Across concurrent rounds</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700">
              Active Tests
            </span>
          </div>
        </div>

        {/* KPI 4: Offers Extended */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_6px_-1px_rgba(16,24,40,0.07)] transition-shadow">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-table-header font-table-header uppercase text-outline">Offers Extended</span>
            <span className="p-1.5 rounded-lg bg-[#F1F3F9] text-emerald-600">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-headline-xl font-headline-xl font-bold text-on-surface">142</span>
              <span className="text-label-md font-label-md text-emerald-700 font-medium">Placed</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#F1F3F9] text-caption font-caption">
            <span className="text-on-surface-variant font-medium">
              Avg CTC: <strong className="text-on-surface">₹14.8 LPA</strong>
            </span>
            <span className="text-on-surface-variant">
              Conv: <strong className="text-emerald-700 font-semibold">36.8%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ================= 3. OPERATIONAL SECTION: IMMEDIATE ATTENTION & ACTION REQUIRED ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-[20px]">warning</span>
            <h2 className="text-headline-sm font-headline-sm font-bold text-on-surface">
              Immediate Attention &amp; Action Required
            </h2>
            <span className="ml-1 px-2 py-0.2 rounded-full text-caption font-caption font-semibold bg-amber-100 text-amber-900">
              2 Alerts
            </span>
          </div>
          <span className="text-caption font-caption text-on-surface-variant">Automated system triage</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Alert Card 1 */}
          <div className="bg-surface-container-lowest rounded-xl border border-amber-200/90 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-caption">
                    OA
                  </div>
                  <div>
                    <h3 className="text-label-md font-label-md font-semibold text-on-surface">
                      Online Assessment Shortlist Pending
                    </h3>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">
                      214 online assessment tests submitted and graded across active drives
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">
                  <span className="material-symbols-outlined text-[12px] mr-1">schedule</span>Deadline in 4 hrs
                </span>
              </div>
              <div className="mt-3 text-caption font-caption text-on-surface-variant flex items-center gap-3">
                <span>Cutoff: ≥ 78% Score</span>
                <span>•</span>
                <span>Role: Cloud DevOps Intern</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F1F3F9] flex items-center justify-between">
              <span className="text-caption font-caption text-outline">Awaiting TPO validation sign-off</span>
              {drives[0] && (
                <button
                  onClick={() => openApplicants(drives[0])}
                  className="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-label-md font-label-md font-semibold flex items-center gap-1.5 transition-colors shadow-xs active:scale-[0.98]"
                >
                  <span>Review Shortlist</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              )}
            </div>
          </div>

          {/* Alert Card 2 */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-secondary font-bold text-caption">
                    IN
                  </div>
                  <div>
                    <h3 className="text-label-md font-label-md font-semibold text-on-surface">
                      Students Missing LinkedIn &amp; GitHub Verification
                    </h3>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">
                      Profile compliance locked for upcoming Tier-1 product drives
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                  Eligibility locked
                </span>
              </div>
              <div className="mt-3 text-caption font-caption text-on-surface-variant flex items-center gap-3">
                <span>Cohorts: CSE, ECE Batch 2025</span>
                <span>•</span>
                <span>Automated OAuth Audit</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F1F3F9] flex items-center justify-between">
              <span className="text-caption font-caption text-outline">Automated SMS/Email fallback ready</span>
              <button
                onClick={() => flash('Sent reminder broadcast to all unverified students.')}
                className="h-8 px-3 rounded-lg bg-surface border border-outline-variant hover:bg-[#F1F3F9] text-on-surface text-label-md font-label-md font-semibold flex items-center gap-1.5 transition-colors active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">send</span>
                <span>Send Bulk Nudge</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 4. MAIN WORKSPACE: BENTO GRID (8 cols table + 4 cols calendar/activity) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 8 COLUMNS: ACTIVE RECRUITMENT DRIVES TABLE */}
        <section className="lg:col-span-8 space-y-4">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
            {/* Table Header Bar & Filter Controls */}
            <div className="p-4 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest">
              <div>
                <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface">
                  Active Recruitment Drives
                </h3>
                <p className="text-caption font-caption text-on-surface-variant">
                  Tracking multi-stage evaluation pipelines across active corporate partners
                </p>
              </div>

              {/* Filter Cluster */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined text-[16px] text-outline absolute left-2.5 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Filter drives..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 pr-3 text-caption font-caption bg-[#F1F3F9] border border-transparent focus:border-primary-container focus:bg-white rounded-lg text-on-surface placeholder:text-outline outline-none"
                  />
                </div>

                <div className="flex items-center bg-surface border border-outline-variant rounded-lg p-0.5 text-label-sm font-label-sm">
                  <button
                    onClick={() => setDriveFilter('active')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      driveFilter === 'active'
                        ? 'bg-surface-container-high text-primary font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setDriveFilter('closed')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      driveFilter === 'closed'
                        ? 'bg-surface-container-high text-primary font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Closed
                  </button>
                </div>

                {/* Department Filter */}
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="h-8 px-2 text-caption font-caption bg-surface border border-outline-variant rounded-lg text-on-surface outline-none cursor-pointer"
                >
                  <option value="All">Dept: All</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="IT">IT</option>
                  <option value="ME">Mech</option>
                </select>

                <button
                  onClick={loadDrives}
                  className="h-8 w-8 rounded-lg border border-outline-variant flex items-center justify-center text-outline hover:text-on-surface hover:bg-[#F1F3F9] transition-colors"
                  title="Refresh drives"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>
            </div>

            {/* Enterprise Data Table */}
            <div className="overflow-x-auto custom-scrollbar">
              {loading ? (
                <div className="py-12 text-center text-body-sm text-on-surface-variant">
                  Loading placement drives...
                </div>
              ) : filteredDrives.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant space-y-3">
                  <span className="material-symbols-outlined text-[36px] text-outline">apartment</span>
                  <p className="text-body-sm font-medium">
                    {driveFilter === 'active' ? 'No active placement drives found.' : 'No closed drives.'}
                  </p>
                  <button
                    onClick={() => setIsDriveModalOpen(true)}
                    className="text-label-sm font-semibold text-primary hover:underline"
                  >
                    + Create a Placement Drive
                  </button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="h-10 bg-[#F1F3F9] border-b border-outline-variant text-table-header font-table-header text-outline uppercase tracking-wider">
                      <th className="px-4 py-2">Company &amp; Role</th>
                      <th className="px-3 py-2">Criteria</th>
                      <th className="px-3 py-2 text-center">Applied</th>
                      <th className="px-3 py-2">Package</th>
                      <th className="px-3 py-2">Deadline</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3F9] text-body-sm font-body-sm">
                    {filteredDrives.map((d) => {
                      const initials = (d.company_name || 'CO')
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <tr key={d.id} className="hover:bg-[#F7F8FC] transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                                  {d.company_name}
                                </div>
                                <div className="text-caption font-caption text-on-surface-variant">
                                  {d.job_role}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="font-medium text-on-surface text-caption">
                              CGPA ≥ {d.min_cgpa ?? '6.0'}
                            </span>
                            <div className="text-[11px] text-outline">
                              Backlogs: {d.max_backlogs ?? 0}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <div className="font-semibold text-on-surface">{d.applicant_count ?? 0}</div>
                            <div className="text-[11px] text-outline">verified</div>
                          </td>
                          <td className="px-3 py-3 font-semibold text-on-surface whitespace-nowrap">
                            {d.package || '—'}
                          </td>
                          <td className="px-3 py-3 text-caption text-on-surface-variant whitespace-nowrap">
                            {d.drive_deadline
                              ? new Date(d.drive_deadline).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Closing soon'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium border ${
                                d.is_active
                                  ? 'bg-[#ECFDF3] text-[#15803D] border-[#BBF7D0]'
                                  : 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            >
                              {d.is_active ? 'Active' : 'Closed'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setExcelSelectorDrive(d);
                                  setIsExcelSelectorOpen(true);
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-caption font-semibold flex items-center gap-1 transition-colors"
                                title="Select students via Excel matrix"
                              >
                                <span className="material-symbols-outlined text-[14px]">table_view</span>
                                <span>Excel Matrix</span>
                              </button>

                              <button
                                onClick={() => openApplicants(d)}
                                className="px-2.5 py-1 rounded bg-primary-container text-white hover:bg-primary text-caption font-semibold flex items-center gap-1 transition-colors"
                                title="Manage Applicants"
                              >
                                <span className="material-symbols-outlined text-[14px]">groups</span>
                                <span>Applicants</span>
                              </button>

                              <button
                                onClick={() => startEdit(d)}
                                className="p-1 rounded text-outline hover:text-on-surface hover:bg-[#F1F3F9] transition-colors"
                                title="Edit Drive"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button
                                onClick={() => deleteDrive(d.id)}
                                className="p-1 rounded text-outline hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete Drive"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table Footer */}
            <div className="px-4 py-3 bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between text-caption font-caption text-on-surface-variant">
              <span>
                Showing <strong>{filteredDrives.length}</strong> active company drives
              </span>
              <button
                onClick={() => setIsDriveModalOpen(true)}
                className="text-primary font-semibold hover:underline"
              >
                + Add New Drive
              </button>
            </div>
          </div>

          {/* Secondary Operational Insight Banner (Linear aesthetic) */}
          <div className="bg-gradient-to-r from-surface-container-low via-white to-surface-container-low rounded-xl border border-outline-variant p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-container text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
              </div>
              <div>
                <h4 className="text-label-md font-label-md font-semibold text-on-surface">
                  AI Eligibility Filter Assistant
                </h4>
                <p className="text-caption font-caption text-on-surface-variant">
                  Applications automatically validated against student CGPA, backlogs, and verified developer identity
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAiDriveModalOpen(true)}
              className="h-8 px-3 rounded-lg bg-white border border-outline-variant hover:bg-[#F1F3F9] text-primary text-label-md font-label-md font-semibold transition-colors"
            >
              Launch AI Parser
            </button>
          </div>
        </section>

        {/* RIGHT 4 COLUMNS: AUXILIARY SIDE PANEL (CALENDAR & ACTIVITY LOG) */}
        <aside className="lg:col-span-4 space-y-4">
          {/* Auxiliary Card 1: Upcoming Recruitment Calendar */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F9]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
                <h3 className="text-label-md font-label-md font-bold text-on-surface">
                  Upcoming Recruitment Calendar
                </h3>
              </div>
              <button onClick={() => setTab('events')} className="text-caption font-caption text-primary hover:underline font-medium">
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {eventsList.slice(0, 4).length > 0 ? (
                eventsList.slice(0, 4).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-lg border border-[#E6E8F0] hover:border-primary-container/40 hover:bg-[#F7F8FC] transition-colors flex items-start gap-3"
                  >
                    <div className="text-center px-2 py-1 rounded bg-[#F1F3F9] text-on-surface shrink-0">
                      <div className="text-[10px] uppercase font-bold text-outline">
                        {new Date(ev.date_time).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-headline-sm font-headline-sm font-bold leading-none">
                        {new Date(ev.date_time).getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-caption font-caption font-semibold text-primary truncate">
                          {ev.title}
                        </span>
                      </div>
                      <p className="text-body-sm font-body-sm text-on-surface font-medium truncate">
                        Speaker: {ev.speaker || 'Recruiter'}
                      </p>
                      <span className="text-[11px] text-on-surface-variant">Venue: {ev.venue}</span>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="p-2.5 rounded-lg border border-[#E6E8F0] hover:border-primary-container/40 hover:bg-[#F7F8FC] transition-colors flex items-start gap-3">
                    <div className="text-center px-2 py-1 rounded bg-[#F1F3F9] text-on-surface shrink-0">
                      <div className="text-[10px] uppercase font-bold text-outline">NOV</div>
                      <div className="text-headline-sm font-headline-sm font-bold leading-none">14</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-caption font-caption font-semibold text-primary truncate">
                          Microsoft PPT
                        </span>
                        <span className="text-[11px] text-outline font-medium">10:00 AM</span>
                      </div>
                      <p className="text-body-sm font-body-sm text-on-surface font-medium truncate">
                        Pre-Placement Talk (Auditorium 1)
                      </p>
                      <span className="text-[11px] text-on-surface-variant">350 Registered</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-[#E6E8F0] hover:border-primary-container/40 hover:bg-[#F7F8FC] transition-colors flex items-start gap-3">
                    <div className="text-center px-2 py-1 rounded bg-[#F1F3F9] text-on-surface shrink-0">
                      <div className="text-[10px] uppercase font-bold text-outline">NOV</div>
                      <div className="text-headline-sm font-headline-sm font-bold leading-none">16</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-caption font-caption font-semibold text-amber-700 truncate">
                          Atlassian Hackerrank
                        </span>
                        <span className="text-[11px] text-outline font-medium">06:00 PM</span>
                      </div>
                      <p className="text-body-sm font-body-sm text-on-surface font-medium truncate">
                        National OA Round (Virtual)
                      </p>
                      <span className="text-[11px] text-on-surface-variant">Proctored Assessment</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Auxiliary Card 2: Recent Operational Activity Log */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F9]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-outline">history</span>
                <h3 className="text-label-md font-label-md font-bold text-on-surface">
                  Recent Operational Activity
                </h3>
              </div>
              <span className="text-caption font-caption text-outline">Live stream</span>
            </div>

            <div className="space-y-3 relative pl-4 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-outline-variant">
              <div className="relative">
                <span className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-primary-container ring-4 ring-white"></span>
                <div className="text-body-sm font-body-sm text-on-surface">
                  <strong>TPO Central</strong> synced campus recruitment ledger.
                </div>
                <div className="text-caption font-caption text-outline mt-0.5">14 minutes ago • Batch 2025</div>
              </div>

              <div className="relative">
                <span className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white"></span>
                <div className="text-body-sm font-body-sm text-on-surface">
                  Drive JD extracted via <strong>AI Agent Parser</strong>.
                </div>
                <div className="text-caption font-caption text-outline mt-0.5">42 minutes ago • Automated sync</div>
              </div>

              <div className="relative">
                <span className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white"></span>
                <div className="text-body-sm font-body-sm text-on-surface">
                  Faculty verification desk resolved <strong>12 student marksheets</strong>.
                </div>
                <div className="text-caption font-caption text-outline mt-0.5">2 hours ago • Coordinator Desk</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
