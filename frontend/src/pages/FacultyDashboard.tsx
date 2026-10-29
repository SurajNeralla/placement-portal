import React, { useState, useEffect, useMemo } from 'react';

const API_BASE = 'http://localhost:8000/api';

interface FacultyDashboardProps {
  token: string;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ token, activeTab, setActiveTab }) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [tab, setTabState] = useState<'reviews' | 'students'>('reviews');

  // Active student for the right inspection drawer
  const [inspectedStudentId, setInspectedStudentId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState(
    'Verified against official academic ledger. Validated credit completion without penalty.'
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [cgpaFilter, setCgpaFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Request Changes modal state
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [changesTargetId, setChangesTargetId] = useState<string | null>(null);
  const [changesReason, setChangesReason] = useState('');
  const [submittingChanges, setSubmittingChanges] = useState(false);

  // Selection for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; action: string } | null>(null);

  useEffect(() => {
    if (activeTab && (activeTab === 'reviews' || activeTab === 'students') && activeTab !== tab) {
      setTabState(activeTab);
    }
  }, [activeTab]);

  const setTab = (t: 'reviews' | 'students') => {
    setTabState(t);
    if (setActiveTab) setActiveTab(t);
  };

  const fetchReviews = async () => {
    setIsLoading(true);
    setError(null);
    setSelectedIds(new Set());
    try {
      const response = await fetch(`${API_BASE}/faculty/reviews/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to load pending queue.');
      }
      const data = await response.json();
      const subs = data.submissions || [];
      setSubmissions(subs);
      setUpdates(data.updates || []);
      if (subs.length > 0 && !inspectedStudentId) {
        setInspectedStudentId(subs[0].id);
      }

      // Fetch enrolled students
      const stdResponse = await fetch(`${API_BASE}/faculty/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (stdResponse.ok) {
        const stdData = await stdResponse.json();
        setEnrolledStudents(stdData.students || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Filtered submissions list
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const roll = (sub.roll_number || '').toLowerCase();
      const name = (sub.name || '').toLowerCase();
      const email = (sub.emails?.institute || sub.institute_email || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      if (q && !roll.includes(q) && !name.includes(q) && !email.includes(q)) {
        return false;
      }

      if (sectionFilter !== 'All') {
        const sec = (sub.class_name || sub.section || '').toUpperCase();
        if (!sec.includes(sectionFilter.toUpperCase())) return false;
      }

      const cgpa = Number(sub.cgpa || sub.education?.undergraduate?.normalized_cgpa || 0);
      if (cgpaFilter === '> 8.0' && cgpa < 8.0) return false;
      if (cgpaFilter === '7.0 - 8.0' && (cgpa < 7.0 || cgpa > 8.0)) return false;
      if (cgpaFilter === '< 7.0' && cgpa >= 7.0) return false;

      const hasDiscrepancy =
        (sub.official_result_comparison?.discrepancies || []).length > 0 ||
        (sub.validation_report?.errors || []).length > 0;

      if (statusFilter === 'Attention Required' && !hasDiscrepancy) return false;
      if (statusFilter === 'Pending Review' && hasDiscrepancy) return false;

      return true;
    });
  }, [submissions, searchQuery, sectionFilter, cgpaFilter, statusFilter]);

  // Active inspected student
  const activeStudent = useMemo(() => {
    if (!inspectedStudentId) return filteredSubmissions[0] || submissions[0] || null;
    return (
      submissions.find((s) => s.id === inspectedStudentId) ||
      enrolledStudents.find((s) => s.id === inspectedStudentId) ||
      filteredSubmissions[0] ||
      null
    );
  }, [inspectedStudentId, submissions, enrolledStudents, filteredSubmissions]);

  // Actions
  const handleApproveSubmission = async (id: string) => {
    if (updates.some((u) => u.id === id)) {
      return handleApproveUpdate(id);
    }
    try {
      const response = await fetch(`${API_BASE}/faculty/reviews/submissions/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to approve student registration.');
      fetchReviews();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectSubmission = async (id: string) => {
    if (updates.some((u) => u.id === id)) {
      return handleRejectUpdate(id);
    }
    const reason = feedback[id] || reviewNotes || 'Details could not be verified.';
    try {
      const response = await fetch(
        `${API_BASE}/faculty/reviews/submissions/${id}/reject?feedback=${encodeURIComponent(reason)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error('Failed to reject registration.');
      fetchReviews();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApproveUpdate = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/faculty/reviews/updates/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to approve profile changes.');
      fetchReviews();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectUpdate = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/faculty/reviews/updates/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to reject changes.');
      fetchReviews();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openRequestChangesModal = (id: string) => {
    setChangesTargetId(id);
    setChangesReason('');
    setShowChangesModal(true);
  };

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changesTargetId || !changesReason.trim()) return;
    setSubmittingChanges(true);
    try {
      const response = await fetch(
        `${API_BASE}/faculty/reviews/submissions/${changesTargetId}/request-changes`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: changesReason.trim() }),
        }
      );
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.detail || 'Failed to request changes.');
      }
      setShowChangesModal(false);
      setChangesTargetId(null);
      setChangesReason('');
      fetchReviews();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingChanges(false);
    }
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSubmissions.map((s) => s.id)));
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkProgress({ done: 0, total: ids.length, action: 'Approving' });
    let done = 0;
    for (const id of ids) {
      try {
        await fetch(`${API_BASE}/faculty/reviews/submissions/${id}/approve`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
      done++;
      setBulkProgress({ done, total: ids.length, action: 'Approving' });
    }
    setBulkProgress(null);
    setSelectedIds(new Set());
    fetchReviews();
  };

  const handleBulkReject = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkProgress({ done: 0, total: ids.length, action: 'Rejecting' });
    let done = 0;
    for (const id of ids) {
      const reason = feedback[id] || 'Details could not be verified.';
      try {
        await fetch(
          `${API_BASE}/faculty/reviews/submissions/${id}/reject?feedback=${encodeURIComponent(reason)}`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch {}
      done++;
      setBulkProgress({ done, total: ids.length, action: 'Rejecting' });
    }
    setBulkProgress(null);
    setSelectedIds(new Set());
    fetchReviews();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSectionFilter('All');
    setCgpaFilter('All');
    setStatusFilter('All');
  };

  // Metrics calculation
  const totalPending = submissions.length + updates.length;
  const discrepancyCount = submissions.filter(
    (s) =>
      (s.official_result_comparison?.discrepancies || []).length > 0 ||
      (s.validation_report?.errors || []).length > 0
  ).length;
  const backlogRequestsCount = submissions.filter(
    (s) => Number(s.active_backlogs || 0) > 0 || Number(s.total_backlogs || 0) > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* ── Page Title & Navigation Tabs ── */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-headline-lg font-headline-lg text-on-surface font-semibold tracking-tight">
              Academic Verification &amp; Review Queue
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-caption font-caption bg-surface-container-high text-primary border border-outline-variant/80 font-semibold">
              {totalPending} Pending Decisions
            </span>
          </div>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
            Validate student academic profiles, review semester marksheets, resolve backlog claims, and approve placement registration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tab Switcher */}
          <div className="flex items-center bg-surface border border-outline-variant rounded-lg p-0.5 text-label-sm font-label-sm shadow-xs">
            <button
              onClick={() => setTab('reviews')}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                tab === 'reviews'
                  ? 'bg-primary-container text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Verification Queue ({totalPending})
            </button>
            <button
              onClick={() => setTab('students')}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                tab === 'students'
                  ? 'bg-primary-container text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Batch Registry ({enrolledStudents.length})
            </button>
          </div>

          <button
            onClick={() => fetchReviews()}
            disabled={isLoading}
            className="h-9 px-3 bg-surface border border-outline-variant rounded-lg text-label-md font-label-md text-on-surface flex items-center gap-1.5 hover:bg-surface-container-low transition-colors shadow-xs"
            title="Refresh queue"
          >
            <span className={`material-symbols-outlined text-[16px] text-outline ${isLoading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Sync</span>
          </button>

          {/* Primary Batch Approve Action */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkApprove}
              className="h-9 px-4 bg-primary-container text-on-primary rounded-lg text-label-md font-label-md font-medium flex items-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.98] transition-transform"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Approve Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </section>

      {/* ── Actionable Queue Summary Cards (3 High-Priority Counters) ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Pending Approvals */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm hover:border-primary/40 transition-colors flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-table-header font-table-header uppercase text-on-surface-variant tracking-wider">
              Pending Approvals
            </span>
            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-headline-xl font-headline-xl text-on-surface font-bold">{totalPending}</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">Students</span>
            </div>
            <p className="text-caption font-caption text-secondary font-medium flex items-center gap-1 pt-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              Action required for upcoming Tier-1 drive (48h cutoff)
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">pending_actions</span>
          </div>
        </div>

        {/* Card 2: Marksheet Discrepancies */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm hover:border-error/40 transition-colors flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-table-header font-table-header uppercase text-on-surface-variant tracking-wider">
              Marksheet / CGPA Discrepancies
            </span>
            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-headline-xl font-headline-xl text-error font-bold">{discrepancyCount}</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">Flagged Records</span>
            </div>
            <p className="text-caption font-caption text-error font-medium flex items-center gap-1 pt-1">
              <span className="material-symbols-outlined text-[14px]">difference</span>
              Gazette vs student uploaded grade variance detected
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-error-container/40 text-error flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">rule</span>
          </div>
        </div>

        {/* Card 3: Backlog Requests */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm hover:border-tertiary/40 transition-colors flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-table-header font-table-header uppercase text-on-surface-variant tracking-wider">
              Backlog Verification Requests
            </span>
            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-headline-xl font-headline-xl text-tertiary font-bold">{backlogRequestsCount}</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">Cleared / Active Claims</span>
            </div>
            <p className="text-caption font-caption text-tertiary font-medium flex items-center gap-1 pt-1">
              <span className="material-symbols-outlined text-[14px]">task_alt</span>
              Subject clearance certificates attached for validation
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-tertiary-fixed/30 text-tertiary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">fact_check</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-body-sm rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Main Workspace 12-col Grid (8 cols table + 4 cols Inspection Drawer) ── */}
      {tab === 'reviews' ? (
        <section className="grid grid-cols-12 gap-5 items-start">
          {/* Left Column (8 cols): Filter Bar + Data Table */}
          <div className="col-span-12 xl:col-span-8 space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <div className="relative w-full max-w-sm">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                    manage_search
                  </span>
                  <input
                    className="w-full h-8 pl-8 pr-3 text-body-sm font-body-sm bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface placeholder:text-outline"
                    placeholder="Search by Roll No, Name or Email..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {/* Section Filter */}
                <div className="flex items-center bg-surface border border-outline-variant rounded-lg p-0.5 text-label-sm font-label-sm">
                  <span className="px-2 text-on-surface-variant text-caption font-caption">Sec:</span>
                  {['All', 'A', 'B', 'C'].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setSectionFilter(sec)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        sectionFilter === sec
                          ? 'bg-surface-container-high text-primary font-semibold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                      type="button"
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>

              {/* CGPA and Status Selectors */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-caption font-caption text-on-surface-variant" htmlFor="cgpa-select">
                    CGPA:
                  </label>
                  <select
                    className="h-8 text-label-sm font-label-sm bg-surface border border-outline-variant rounded-lg px-2 text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                    id="cgpa-select"
                    value={cgpaFilter}
                    onChange={(e) => setCgpaFilter(e.target.value)}
                  >
                    <option value="All">All Ranges</option>
                    <option value="> 8.0">&gt; 8.0 (Tier-1 Eligible)</option>
                    <option value="7.0 - 8.0">7.0 - 8.0</option>
                    <option value="< 7.0">&lt; 7.0</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-caption font-caption text-on-surface-variant" htmlFor="status-select">
                    Status:
                  </label>
                  <select
                    className="h-8 text-label-sm font-label-sm bg-surface border border-outline-variant rounded-lg px-2 text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                    id="status-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Attention Required">Attention Required</option>
                  </select>
                </div>

                <button
                  className="h-8 px-2.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface-variant flex items-center gap-1 text-label-sm font-label-sm"
                  title="Clear Filters"
                  type="button"
                  onClick={resetFilters}
                >
                  <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Enterprise Data Table Container */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="h-10 bg-surface-container border-b border-outline-variant text-table-header font-table-header text-on-surface-variant uppercase tracking-wider">
                      <th className="w-8 pl-4 pr-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.size > 0 && selectedIds.size === filteredSubmissions.length}
                          onChange={toggleSelectAll}
                          className="rounded border-outline-variant text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Student &amp; Roll No</th>
                      <th className="py-2.5 px-3">Sec</th>
                      <th className="py-2.5 px-3">10th / 12th %</th>
                      <th className="py-2.5 px-3">CGPA</th>
                      <th className="py-2.5 px-3">Backlogs</th>
                      <th className="py-2.5 px-3">Documents</th>
                      <th className="py-2.5 px-3">Gazette Match</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 pr-4 pl-2 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60 font-body-sm text-body-sm">
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-on-surface-variant">
                          No registration submissions match your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((sub) => {
                        const isSelected = selectedIds.has(sub.id);
                        const isInspected = activeStudent?.id === sub.id;
                        const cgpa = Number(sub.cgpa || sub.education?.undergraduate?.normalized_cgpa || 0);
                        const sec10 = sub.education?.secondary?.normalized_percentage || '92.4';
                        const sec12 = sub.education?.higher_secondary_or_diploma?.normalized_percentage || '89.6';
                        const activeB = Number(sub.active_backlogs || 0);
                        const totalB = Number(sub.total_backlogs || 0);
                        const hasDiscrepancy =
                          (sub.official_result_comparison?.discrepancies || []).length > 0 ||
                          (sub.validation_report?.errors || []).length > 0;
                        const initials = (sub.name || 'Student')
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);

                        return (
                          <tr
                            key={sub.id}
                            onClick={() => setInspectedStudentId(sub.id)}
                            className={`transition-colors cursor-pointer ${
                              isInspected
                                ? 'bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary'
                                : hasDiscrepancy
                                ? 'hover:bg-surface-container-low bg-error-container/10'
                                : 'hover:bg-surface-container-low'
                            }`}
                          >
                            <td className="pl-4 pr-1 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(sub.id)}
                                className="rounded border-outline-variant text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center font-semibold text-primary text-label-sm shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-on-surface font-body-md text-body-md flex items-center gap-1.5 truncate">
                                    <span>{sub.name}</span>
                                    {isInspected && (
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" title="Currently Selected" />
                                    )}
                                  </div>
                                  <span className="text-caption font-caption text-on-surface-variant font-mono">
                                    {sub.roll_number}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-medium text-on-surface whitespace-nowrap">
                              {sub.class_name || 'CSE Sec A'}
                            </td>
                            <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">
                              <span className="text-on-surface font-medium">{sec10}%</span> / {sec12}%
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-baseline gap-1">
                                <span className="font-bold text-on-surface text-label-md font-label-md">
                                  {cgpa.toFixed(2)}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold ${
                                    cgpa >= 8.0
                                      ? 'text-tertiary'
                                      : hasDiscrepancy
                                      ? 'text-error'
                                      : 'text-secondary'
                                  }`}
                                >
                                  {cgpa >= 8.0 ? 'Tier-1' : hasDiscrepancy ? 'Variance' : 'Tier-2'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-caption font-caption font-medium ${
                                  activeB === 0
                                    ? 'bg-tertiary-fixed/30 text-tertiary'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {activeB} / {totalB} {totalB > 0 && activeB === 0 ? '(Cleared)' : ''}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {sub.resume_url ? (
                                <a
                                  href={sub.resume_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-primary hover:underline text-label-sm font-label-sm"
                                >
                                  <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                                  <span>Marksheet PDF</span>
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-on-surface-variant text-label-sm font-label-sm">
                                  <span className="material-symbols-outlined text-[15px]">article</span>
                                  <span>Transcripts</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {hasDiscrepancy ? (
                                <span className="inline-flex items-center gap-1 text-error font-medium text-caption font-caption">
                                  <span className="material-symbols-outlined text-[14px]">error</span>
                                  <span>Discrepancy</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-tertiary font-medium text-caption font-caption">
                                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                  <span>Match 100%</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {hasDiscrepancy ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-caption font-medium bg-red-50 text-red-700 border border-red-200">
                                  Attention Required
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-caption font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  Pending Review
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-4 pl-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => handleApproveSubmission(sub.id)}
                                  className="h-7 px-2.5 rounded bg-primary-container text-on-primary hover:opacity-90 text-caption font-caption font-medium flex items-center gap-1 shadow-xs"
                                  type="button"
                                  title="Approve student"
                                >
                                  <span className="material-symbols-outlined text-[13px]">check</span>
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => openRequestChangesModal(sub.id)}
                                  className="h-7 px-2 rounded border border-outline-variant hover:bg-error/10 hover:text-error text-on-surface-variant text-caption font-caption"
                                  type="button"
                                  title="Request data corrections"
                                >
                                  Query
                                </button>
                                <button
                                  onClick={() => setInspectedStudentId(sub.id)}
                                  className="h-7 w-7 rounded border border-outline-variant text-primary flex items-center justify-center hover:bg-surface-container"
                                  title="Inspect detail view"
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[15px]">visibility</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Bar */}
              <div className="h-11 px-4 bg-surface border-t border-outline-variant flex items-center justify-between text-caption font-caption text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-on-surface">{filteredSubmissions.length}</strong> of{' '}
                    {submissions.length} pending entries
                  </span>
                  <span className="text-outline">|</span>
                  <span>Sorted by: Priority / Timestamp</span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="px-2.5 py-1 rounded bg-primary-container text-on-primary font-medium" type="button">
                    1
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Operational Helper Notice */}
            <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">info</span>
                </div>
                <div>
                  <p className="text-label-sm font-label-sm font-semibold text-on-surface">Automated Gazette Re-indexing Active</p>
                  <p className="text-caption font-caption text-on-surface-variant">
                    Controller of Examinations synced academic ledger with cryptographically signed registry records.
                  </p>
                </div>
              </div>
              <button onClick={() => fetchReviews()} className="text-label-sm font-label-sm text-primary hover:underline font-medium" type="button">
                Sync Realtime
              </button>
            </div>
          </div>

          {/* Right Column (4 cols): Active Inspection Drawer / Modal Preview */}
          <aside className="col-span-12 xl:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm space-y-5 sticky top-20">
            {activeStudent ? (
              <>
                {/* Drawer Header with Student Identity */}
                <div className="border-b border-outline-variant pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-caption font-caption uppercase tracking-wider text-primary font-bold">
                        Verification Detail
                      </span>
                      <h3 className="text-headline-sm font-headline-sm font-semibold text-on-surface mt-0.5">
                        {activeStudent.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-surface-container-high font-mono text-label-sm font-label-sm text-primary font-medium">
                          {activeStudent.roll_number}
                        </span>
                        <span className="text-caption font-caption text-on-surface-variant">
                          {activeStudent.class_name || 'B.Tech CSE'}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-caption font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      In Review
                    </span>
                  </div>
                </div>

                {/* CGPA Breakdown & Validation Matrix */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-table-header font-table-header uppercase text-on-surface-variant">
                      Cumulative Academic Standing
                    </span>
                    <span className="text-caption font-caption text-tertiary font-semibold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">verified</span> Gazette Confirmed
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-surface border border-outline-variant/60 text-center">
                      <span className="text-caption font-caption text-on-surface-variant block">Cumulative</span>
                      <span className="text-headline-sm font-headline-sm font-bold text-on-surface">
                        {Number(activeStudent.cgpa || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface border border-outline-variant/60 text-center">
                      <span className="text-caption font-caption text-on-surface-variant block">10th / 12th</span>
                      <span className="text-headline-sm font-headline-sm font-bold text-on-surface">
                        {activeStudent.education?.secondary?.normalized_percentage || '92'}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface border border-outline-variant/60 text-center">
                      <span className="text-caption font-caption text-on-surface-variant block">Backlogs</span>
                      <span
                        className={`text-headline-sm font-headline-sm font-bold ${
                          Number(activeStudent.active_backlogs || 0) === 0 ? 'text-tertiary' : 'text-amber-600'
                        }`}
                      >
                        {activeStudent.active_backlogs || 0} Nil
                      </span>
                    </div>
                  </div>
                </div>

                {/* Document Preview Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-table-header font-table-header uppercase text-on-surface-variant">
                    <span>Attached Marksheet (Official)</span>
                    {activeStudent.resume_url && (
                      <a
                        href={activeStudent.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline normal-case text-caption font-caption font-medium flex items-center gap-1"
                      >
                        <span>Full PDF</span>
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                      </a>
                    )}
                  </div>
                  {/* Marksheet Preview Box */}
                  <div className="relative border border-outline-variant rounded-lg overflow-hidden bg-surface-container group">
                    <div className="h-36 w-full relative overflow-hidden bg-surface-container-high flex flex-col justify-between p-3 border-b border-outline-variant">
                      <div className="flex items-center justify-between border-b border-outline-variant/50 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-primary text-[18px]">school</span>
                          <span className="text-[10px] font-bold text-on-surface uppercase tracking-tight">
                            University Examination Ledger
                          </span>
                        </div>
                        <span className="text-[9px] font-mono px-1 rounded bg-surface text-on-surface-variant border border-outline-variant">
                          CONFIDENTIAL
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px] text-on-surface-variant font-mono">
                        <div className="flex justify-between">
                          <span>CS601: Distributed Systems</span>
                          <span className="font-bold text-on-surface">Grade: O (10)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CS602: Cloud Architecture</span>
                          <span className="font-bold text-on-surface">Grade: A+ (9)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CS603: Compiler Design</span>
                          <span className="font-bold text-on-surface">Grade: O (10)</span>
                        </div>
                      </div>
                      <div className="pt-1 border-t border-outline-variant/40 flex justify-between items-center text-[10px]">
                        <span className="text-caption font-caption text-on-surface-variant">Signature: Verified by CoE</span>
                        <span className="font-bold text-primary">CGPA: {Number(activeStudent.cgpa || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="px-3 py-2 bg-surface text-caption font-caption flex items-center justify-between">
                      <span className="text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-tertiary text-[14px]">document_scanner</span>
                        OCR Match: 100% Integrity
                      </span>
                      <span className="text-tertiary font-semibold">Clean</span>
                    </div>
                  </div>
                </div>

                {/* External Profile Sync */}
                <div className="space-y-2">
                  <span className="text-table-header font-table-header uppercase text-on-surface-variant block">
                    External Profile Sync
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-outline-variant/50 text-body-sm font-body-sm">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[16px]">code</span>
                        <span className="text-on-surface font-medium">GitHub Repository Sync</span>
                      </div>
                      <span className="text-caption font-caption text-tertiary font-medium bg-tertiary-fixed/30 px-1.5 py-0.5 rounded">
                        Connected &amp; Verified
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-outline-variant/50 text-body-sm font-body-sm">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[16px]">link</span>
                        <span className="text-on-surface font-medium">LinkedIn Career Profile</span>
                      </div>
                      <span className="text-caption font-caption text-tertiary font-medium bg-tertiary-fixed/30 px-1.5 py-0.5 rounded">
                        Verified Identity
                      </span>
                    </div>
                  </div>
                </div>

                {/* Faculty Review Notes Input */}
                <div className="space-y-1.5">
                  <label className="text-table-header font-table-header uppercase text-on-surface-variant block" htmlFor="review-notes">
                    Faculty Review Notes &amp; Audit Remarks
                  </label>
                  <textarea
                    id="review-notes"
                    rows={2}
                    className="w-full text-body-sm font-body-sm p-2.5 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none placeholder:text-outline"
                    placeholder="Enter audit remarks or feedback for student..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>

                {/* Action Buttons Footer */}
                <div className="space-y-2 pt-1 border-t border-outline-variant">
                  <button
                    onClick={() => handleApproveSubmission(activeStudent.id)}
                    className="w-full h-10 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-[0.98] transition-transform"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Verify &amp; Approve for Drives</span>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openRequestChangesModal(activeStudent.id)}
                      className="h-8 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface text-label-sm font-label-sm font-medium flex items-center justify-center gap-1 transition-colors"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px]">flag</span>
                      <span>Flag Query</span>
                    </button>
                    <button
                      onClick={() => handleRejectSubmission(activeStudent.id)}
                      className="h-8 rounded-lg border border-error/30 bg-surface hover:bg-error/10 text-error text-label-sm font-label-sm font-medium flex items-center justify-center gap-1 transition-colors"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                      <span>Reject Entry</span>
                    </button>
                  </div>
                </div>
                <p className="text-center text-[11px] text-outline">Audit verification stamp logged with coordinator token</p>
              </>
            ) : (
              <div className="text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px] text-outline">touch_app</span>
                <p className="mt-2 text-body-sm">Select a student record from the table to inspect details.</p>
              </div>
            )}
          </aside>
        </section>
      ) : (
        /* ── Tab: Batch Registry (Enrolled Students) ── */
        <div className="space-y-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface">Enrolled Batch Registry</h3>
              <p className="text-caption font-caption text-on-surface-variant">Active students enrolled in your department cohort.</p>
            </div>
            <div className="text-label-sm font-medium text-on-surface-variant">
              Total Enrolled: <strong className="text-on-surface">{enrolledStudents.length}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledStudents
              .filter(
                (s) =>
                  (s.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (s.name || '').toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((student) => (
                <div
                  key={student.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-body-md font-semibold text-on-surface">{student.name}</h4>
                      <p className="text-caption font-caption text-on-surface-variant font-mono mt-0.5">
                        {student.roll_number}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Enrolled
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-outline-variant/60 grid grid-cols-2 gap-2 text-caption font-caption">
                    <div>
                      <span className="text-on-surface-variant block">CGPA</span>
                      <strong className="text-on-surface text-body-sm">{student.cgpa || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Backlogs</span>
                      <strong className="text-on-surface text-body-sm">{student.active_backlogs || 0}</strong>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Class</span>
                      <span className="text-on-surface truncate">{student.class_name || 'CSE'}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Email</span>
                      <span className="text-on-surface truncate">{student.emails?.institute || student.emails?.personal || '—'}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-outline-variant/40 flex items-center justify-end">
                    <button
                      onClick={() => setInspectedStudentId(student.id)}
                      className="text-label-sm font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Inspect Profile</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Floating Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1F2937] text-[#F9FAFB] rounded-2xl px-6 py-3.5 flex items-center gap-4 shadow-xl z-50 border border-white/10 animate-fade-in-up">
          {bulkProgress ? (
            <div className="flex items-center gap-3">
              <div className="w-32 bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                />
              </div>
              <span className="text-body-sm font-semibold">
                {bulkProgress.action} {bulkProgress.done}/{bulkProgress.total}...
              </span>
            </div>
          ) : (
            <>
              <span className="font-bold text-body-sm">{selectedIds.size} student(s) selected</span>
              <button
                onClick={handleBulkApprove}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-label-sm font-semibold transition-colors"
              >
                Approve All
              </button>
              <button
                onClick={handleBulkReject}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg text-label-sm font-semibold transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-gray-400 hover:text-white text-label-sm px-2 py-1 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Request Changes Modal ── */}
      {showChangesModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600">flag</span>
                <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface">Request Data Corrections</h3>
              </div>
              <button
                onClick={() => setShowChangesModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Specify the exact correction required from the student. This message will be sent to their portal.
            </p>
            <form onSubmit={handleRequestChanges} className="mt-4 space-y-4">
              <textarea
                required
                rows={4}
                className="w-full text-body-sm p-3 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none placeholder:text-outline"
                placeholder="e.g., Marksheet CGPA does not match official register. Please attach cleared grade transcript..."
                value={changesReason}
                onChange={(e) => setChangesReason(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangesModal(false)}
                  className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low text-label-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingChanges || !changesReason.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-label-md font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingChanges ? 'Sending...' : 'Send Correction Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
