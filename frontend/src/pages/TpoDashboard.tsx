import React, { useState, useEffect, useCallback } from 'react';
import { BulkStudentUpload } from '../components/BulkStudentUpload';

const API = 'http://localhost:8000/api';

interface TpoDashboardProps {
  token: string;
  institutionId: string;
  userId?: string;
}

type Tab = 'drives' | 'create' | 'applicants' | 'export' | 'upload' | 'faculty' | 'students';

const STATUS_OPTS = ['Applied', 'Shortlisted', 'On-Hold', 'Rejected', 'Placed'];
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Applied:     { bg: 'rgba(59,130,246,0.15)',  color: '#60A5FA' },
  Shortlisted: { bg: 'rgba(245,158,11,0.15)',  color: '#FBBF24' },
  Placed:      { bg: 'rgba(16,185,129,0.15)',  color: '#34D399' },
  Rejected:    { bg: 'rgba(239,68,68,0.12)',   color: '#F87171' },
  'On-Hold':   { bg: 'rgba(156,163,175,0.1)',  color: '#6B7280' },
};
const ALL_EXPORT_FIELDS = [
  'Name', 'Roll Number', 'Institute Email', 'Personal Email', 'Mobile',
  'CGPA', 'Active Backlogs', 'Total Backlogs', 'Department', 'Program',
  'Skills', 'Resume Link', 'Status', 'CTC Offered', 'Offer Letter',
];

const EMPTY_FORM = {
  companyName: '', jobRole: '', package: '', location: '', mode: 'On-campus',
  minCgpa: 6.0, maxBacklogs: 0, genderFilter: 'All',
  passoutYear: new Date().getFullYear(), externalLink: '', deadline: '',
  allowedDepts: [] as string[], allowedProgs: [] as string[],
};

export const TpoDashboard: React.FC<TpoDashboardProps> = ({ token, institutionId }) => {
  const [tab, setTab] = useState<Tab>('drives');
  const [drives, setDrives] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<any | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [appsLoading, setAppsLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [facultyForm, setFacultyForm] = useState({ name: '', email: '', phone: '', class_id: '' });
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [exportDriveId, setExportDriveId] = useState('');
  const [exportStatus, setExportStatus] = useState('Shortlisted');
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [exportFields, setExportFields] = useState<string[]>(['Name', 'Roll Number', 'Institute Email', 'CGPA', 'Mobile', 'Skills', 'Resume Link', 'Status']);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 5000);
  };

  const loadDrives = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/tpo/drives`, { headers: h });
      if (res.ok) setDrives(await res.json());
    } finally { setLoading(false); }
  }, [token]);

  const loadHierarchy = useCallback(async () => {
    const res = await fetch(`${API}/institutions/${institutionId}/hierarchy`);
    if (res.ok) setHierarchy((await res.json()).hierarchy || []);
  }, [institutionId]);

  useEffect(() => { loadDrives(); loadHierarchy(); }, [loadDrives, loadHierarchy]);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const res = await fetch(`${API}/tpo/students`, { headers: h });
      if (res.ok) setStudents(await res.json());
    } finally { setStudentsLoading(false); }
  }, [token]);

  useEffect(() => { if (tab === 'students') loadStudents(); }, [tab, loadStudents]);

  const loadApplicants = async (driveId: string) => {
    setAppsLoading(true);
    setSelected([]);
    try {
      const res = await fetch(`${API}/tpo/drives/${driveId}/applications`, { headers: h });
      if (res.ok) setApplicants(await res.json());
    } finally { setAppsLoading(false); }
  };

  const openApplicants = (drive: any) => {
    setSelectedDrive(drive);
    setTab('applicants');
    loadApplicants(drive.id);
  };

  const updateStatus = async (appId: string, status: string) => {
    const res = await fetch(`${API}/tpo/applications/${appId}/status`, {
      method: 'POST', headers: h, body: JSON.stringify({ status }),
    });
    if (res.ok) { flash(`Status → ${status}`); loadApplicants(selectedDrive.id); }
    else flash('Update failed.', false);
  };

  const bulkUpdate = async (status: string) => {
    if (!selected.length) return;
    const res = await fetch(`${API}/tpo/drives/${selectedDrive.id}/bulk-status`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ application_ids: selected, status }),
    });
    if (res.ok) {
      const d = await res.json();
      flash(d.message);
      loadApplicants(selectedDrive.id);
      setSelected([]);
    } else flash('Bulk update failed.', false);
  };

  const createDrive = async () => {
    if (!form.companyName || !form.jobRole || !form.deadline) {
      flash('Company name, job role and deadline are required.', false); return;
    }
    const body = {
      company_name: form.companyName, job_role: form.jobRole, package: form.package,
      location: form.location, mode: form.mode, min_cgpa: form.minCgpa,
      max_backlogs: form.maxBacklogs, gender_filter: form.genderFilter,
      passout_year: form.passoutYear,
      external_apply_link: form.externalLink || null,
      drive_deadline: new Date(form.deadline).toISOString(),
      allowed_departments: form.allowedDepts, allowed_programs: form.allowedProgs,
    };
    const isEdit = !!editingDriveId;
    const url = isEdit ? `${API}/drives/${editingDriveId}` : `${API}/drives/create`;
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: h, body: JSON.stringify(body) });
    if (res.ok) {
      const d = await res.json();
      flash(isEdit ? `✅ Drive updated successfully!` : `✅ Drive published! ${d.eligible_students_notified || 0} student(s) notified.`);
      setForm({ ...EMPTY_FORM });
      setEditingDriveId(null);
      setTab('drives');
      loadDrives();
    } else {
      const d = await res.json();
      flash(d.detail || (isEdit ? 'Failed to update drive.' : 'Failed to create drive.'), false);
    }
  };

  const startEdit = (drive: any) => {
    setForm({
      companyName: drive.company_name,
      jobRole: drive.job_role,
      package: drive.package,
      location: drive.location,
      mode: drive.mode,
      minCgpa: drive.min_cgpa,
      maxBacklogs: drive.max_backlogs,
      genderFilter: drive.gender_filter || 'All',
      passoutYear: drive.passout_year || new Date().getFullYear(),
      externalLink: drive.external_apply_link || '',
      deadline: new Date(drive.drive_deadline).toISOString().slice(0, 16),
      allowedDepts: drive.allowed_departments || [],
      allowedProgs: drive.allowed_programs || [],
    });
    setEditingDriveId(drive.id);
    setTab('create');
  };

  const deleteDrive = async (driveId: string) => {
    if (!window.confirm("Are you sure you want to delete this drive? All related applications will be deleted permanently.")) return;
    const res = await fetch(`${API}/drives/${driveId}`, { method: 'DELETE', headers: h });
    if (res.ok) { flash('✅ Drive deleted successfully!'); loadDrives(); }
    else flash('Failed to delete drive.', false);
  };

  const createFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/faculty/register`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify(facultyForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to register Faculty');
      flash(`✅ Faculty registered! They can now login via OTP to set their password.`);
      setFacultyForm({ name: '', email: '', phone: '', class_id: '' });
    } catch (err: any) {
      flash(err.message, false);
    } finally {
      setLoading(false);
    }
  };



  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTemplate(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/tpo/parse-template`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to parse template');
      setExportFields(data.headers);
      flash(`Template parsed! Found ${data.headers.length} columns.`);
    } catch (err: any) {
      flash(err.message, false);
    } finally {
      setUploadingTemplate(false);
    }
  };

  const exportExcel = async () => {
    if (!exportDriveId) { flash('Select a drive.', false); return; }
    const res = await fetch(`${API}/tpo/drives/${exportDriveId}/export`, {
      method: 'POST', headers: h, body: JSON.stringify({ fields: exportFields, status_filter: exportStatus || null }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      const drive = drives.find(d => d.id === exportDriveId);
      a.download = drive ? `${drive.company_name}_HR_Report.xlsx` : 'PlacementHub_Export.xlsx';
      a.click(); URL.revokeObjectURL(url);
      flash('Excel report downloaded!');
    } else flash('Export failed.', false);
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () =>
    setSelected(applicants.length === selected.length ? [] : applicants.map(a => a.application_id));

  const allDepts = hierarchy.flatMap((p: any) => p.departments);

  const toggleArr = (key: 'allowedDepts' | 'allowedProgs', id: string) =>
    setForm(f => ({
      ...f,
      [key]: f[key].includes(id) ? f[key].filter((x: string) => x !== id) : [...f[key], id],
    }));
  const toggleExportField = (f: string) =>
    setExportFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>TPO Command Center</h1>
          <p style={s.subtitle}>Manage placement drives, review applicants, and export HR data.</p>
        </div>
        <button onClick={loadDrives} style={s.ghostBtn}>↻ Refresh</button>
      </div>

      {msg && (
        <div style={msg.ok ? s.toastOk : s.toastErr}>
          {msg.ok ? '✅' : '⚠️'} {msg.text}
        </div>
      )}

      {/* Tab Nav */}
      <div style={s.tabNav}>
        {([
          { key: 'drives',     label: '🚀 Drives' },
          { key: 'create',     label: '➕ New Drive' },
          { key: 'applicants', label: selectedDrive ? `👥 ${selectedDrive.company_name}` : '👥 Applicants' },
          { key: 'export',     label: '📊 Export' },
          { key: 'upload',     label: '📤 Upload Data' },
          { key: 'faculty',    label: '👩‍🏫 Faculty' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...s.tabBtn, ...(tab === t.key ? s.tabActive : {}) }}>{t.label}</button>
        ))}
      </div>

      {/* ── DRIVES LIST ── */}
      {tab === 'drives' && (
        loading ? <Loader color="#3B82F6"/> :
        drives.length === 0 ? (
          <div style={s.empty}>
            <span style={{ fontSize: '3.5rem' }}>🚀</span>
            <p style={{ fontSize: '1rem', color: '#E5E7EB' }}>No placement drives yet.</p>
            <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Create your first drive and eligible students will be notified automatically.</p>
            <button onClick={() => { setForm({...EMPTY_FORM}); setEditingDriveId(null); setTab('create'); }} style={s.primaryBtn}>Create Drive →</button>
          </div>
        ) : (
          <div style={s.driveGrid}>
            {drives.map(d => (
              <div key={d.id} style={{ ...s.driveCard, ...(d.is_active ? {} : s.cardDim) }}>
                <div style={s.driveTop}>
                  <div style={s.avatar}>{d.company_name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={s.company}>{d.company_name}</div>
                    <div style={s.role}>{d.job_role}</div>
                  </div>
                  <span style={{ ...s.pill, background: d.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)', color: d.is_active ? '#34D399' : '#F87171' }}>
                    {d.is_active ? '● Active' : '● Closed'}
                  </span>
                </div>
                <div style={s.driveStats}>
                  {[
                    { label: 'Applied', val: d.total_applicants, color: '#60A5FA' },
                    { label: 'Shortlisted', val: d.shortlisted, color: '#FBBF24' },
                    { label: 'Placed', val: d.placed, color: '#34D399' },
                  ].map(st => (
                    <div key={st.label} style={s.statBox}>
                      <span style={{ color: st.color, fontWeight: 800, fontSize: '1.3rem' }}>{st.val}</span>
                      <span style={s.statLabel}>{st.label}</span>
                    </div>
                  ))}
                  <div style={s.statBox}>
                    <span style={{ color: '#A78BFA', fontWeight: 800, fontSize: '0.95rem' }}>{d.package}</span>
                    <span style={s.statLabel}>Package</span>
                  </div>
                </div>
                <div style={s.driveFooter}>
                  <span style={{ color: '#6B7280', fontSize: '0.8rem' }}>
                    📅 {new Date(d.drive_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => startEdit(d)} style={{ ...s.appsBtn, background: '#EFF6FF', color: '#3B82F6', flex: 'none', padding: '12px' }} title="Edit Drive">
                      ✏️
                    </button>
                    <button onClick={() => deleteDrive(d.id)} style={{ ...s.appsBtn, background: '#FEF2F2', color: '#EF4444', flex: 'none', padding: '12px' }} title="Delete Drive">
                      🗑️
                    </button>
                    <button onClick={() => openApplicants(d)} style={{ ...s.appsBtn, flex: 1 }}>
                      View Applicants →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── BULK UPLOAD ── */}
      {tab === 'upload' && (
        <div className="animate-fade-in">
          <BulkStudentUpload token={token} institutionId={institutionId} onUploadSuccess={() => flash('Students uploaded to pending queue for Faculty verification!')} />
        </div>
      )}

      {/* ── STUDENTS ── */}
      {tab === 'students' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, color: '#111827', fontSize: '1.1rem', fontWeight: 700 }}>All Students</h3>
              <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '0.8rem' }}>{students.length} total students in your institution</p>
            </div>
            <input
              type="text"
              placeholder="🔍 Search name, roll, email..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              style={{ ...s.input, width: 280 }}
            />
          </div>
          {studentsLoading ? <Loader color="#2563EB" /> : (
            <div style={{ overflowX: 'auto' }}>
              {students
                .filter(st => {
                  const q = studentSearch.toLowerCase();
                  return !q || (st.name||'').toLowerCase().includes(q) ||
                    (st.roll_number||'').toLowerCase().includes(q) ||
                    (st.emails?.institute||'').toLowerCase().includes(q) ||
                    (st.emails?.personal||'').toLowerCase().includes(q);
                })
                .map(st => (
                  <div key={st.id} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                    {/* Summary Row */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: 'pointer' }}
                      onClick={() => setExpandedStudent(expandedStudent === st.id ? null : st.id)}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#2563EB,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                        {(st.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>{st.name}</div>
                        <div style={{ color: '#6B7280', fontSize: '0.78rem', marginTop: 2 }}>
                          {st.roll_number} · {st.department_name || st.program_name || ''} · {st.emails?.institute || st.emails?.personal || ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: st.cgpa >= 8 ? '#10B981' : st.cgpa >= 6 ? '#F59E0B' : '#EF4444' }}>{st.cgpa || '—'}</span>
                        <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>CGPA</span>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: st.status === 'verified' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: st.status === 'verified' ? '#059669' : '#D97706' }}>
                          {st.status || 'pending'}
                        </span>
                        <span style={{ color: '#9CA3AF', fontSize: '1rem' }}>{expandedStudent === st.id ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {/* Expanded Details */}
                    {expandedStudent === st.id && (
                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '20px', background: '#F9FAFB' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px 24px', marginBottom: 16 }}>
                          {[
                            { label: 'Full Name', val: st.name },
                            { label: 'Roll Number', val: st.roll_number },
                            { label: 'Institute Email', val: st.emails?.institute },
                            { label: 'Personal Email', val: st.emails?.personal },
                            { label: 'Mobile', val: st.mobile },
                            { label: 'Program', val: st.program_name },
                            { label: 'Department', val: st.department_name },
                            { label: 'CGPA', val: st.cgpa },
                          ].map(({ label, val }) => (
                            <div key={label}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                              <div style={{ fontSize: '0.88rem', color: '#111827', fontWeight: 500, marginTop: 2 }}>{val || '—'}</div>
                            </div>
                          ))}
                        </div>
                        {/* Raw Excel Data */}
                        {st.extra_data && Object.keys(st.extra_data).length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>📋 All Form Data</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px 24px' }}>
                              {Object.entries(st.extra_data).map(([key, val]: [string, any]) => (
                                <div key={key} style={{ display: 'flex', gap: 8 }}>
                                  <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, flexShrink: 0, minWidth: 120 }}>{key}:</span>
                                  <span style={{ fontSize: '0.75rem', color: '#374151', wordBreak: 'break-all' }}>{String(val ?? '—')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE / EDIT DRIVE ── */}
      {tab === 'create' && (
        <div style={s.formCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={s.formTitle}>{editingDriveId ? 'Edit Placement Drive' : 'Create New Placement Drive'}</h3>
            {editingDriveId && (
              <button onClick={() => { setForm({...EMPTY_FORM}); setEditingDriveId(null); setTab('drives'); }} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}>Cancel Edit</button>
            )}
          </div>
          <div style={s.formGrid}>
            {[
              { label: 'Company Name *', key: 'companyName', placeholder: 'e.g. Google' },
              { label: 'Job Role *', key: 'jobRole', placeholder: 'e.g. Software Engineer' },
              { label: 'Package', key: 'package', placeholder: 'e.g. 18 LPA' },
              { label: 'Location', key: 'location', placeholder: 'e.g. Pune, Hybrid' },
            ].map(f => (
              <label key={f.key} style={s.label}>
                {f.label}
                <input style={s.input} placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}/>
              </label>
            ))}
            <label style={s.label}>Mode
              <select style={s.input} value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}>
                {['On-campus', 'Off-campus', 'Remote', 'Hybrid'].map(m => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label style={s.label}>Gender Filter
              <select style={s.input} value={form.genderFilter} onChange={e => setForm(f => ({ ...f, genderFilter: e.target.value }))}>
                {['All', 'Male', 'Female'].map(g => <option key={g}>{g}</option>)}
              </select>
            </label>
            <label style={s.label}>Min CGPA
              <input style={s.input} type="number" step="0.1" min="0" max="10"
                value={form.minCgpa} onChange={e => setForm(f => ({ ...f, minCgpa: parseFloat(e.target.value) }))}/>
            </label>
            <label style={s.label}>Max Active Backlogs
              <input style={s.input} type="number" min="0"
                value={form.maxBacklogs} onChange={e => setForm(f => ({ ...f, maxBacklogs: parseInt(e.target.value) }))}/>
            </label>
            <label style={s.label}>Passout Year
              <input style={s.input} type="number" value={form.passoutYear}
                onChange={e => setForm(f => ({ ...f, passoutYear: parseInt(e.target.value) }))}/>
            </label>
            <label style={s.label}>Application Deadline *
              <input style={s.input} type="datetime-local" value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}/>
            </label>
            <label style={{ ...s.label, gridColumn: '1 / -1' }}>External Apply Link (optional)
              <input style={s.input} placeholder="https://company.com/careers/apply"
                value={form.externalLink} onChange={e => setForm(f => ({ ...f, externalLink: e.target.value }))}/>
            </label>
          </div>

          <div style={s.sectionLabel}>📁 Allowed Departments</div>
          <div style={s.chips}>
            {allDepts.length === 0 ? <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>No departments found.</span> :
              allDepts.map((d: any) => (
                <label key={d.id} style={{ ...s.chipLabel, ...(form.allowedDepts.includes(d.id) ? s.chipActive : {}) }}>
                  <input type="checkbox" style={{ display: 'none' }}
                    checked={form.allowedDepts.includes(d.id)} onChange={() => toggleArr('allowedDepts', d.id)}/>
                  {d.name}
                </label>
              ))}
          </div>

          <div style={s.sectionLabel}>🎓 Allowed Programs</div>
          <div style={s.chips}>
            {hierarchy.map((p: any) => (
              <label key={p.id} style={{ ...s.chipLabel, ...(form.allowedProgs.includes(p.id) ? s.chipActive : {}) }}>
                <input type="checkbox" style={{ display: 'none' }}
                  checked={form.allowedProgs.includes(p.id)} onChange={() => toggleArr('allowedProgs', p.id)}/>
                {p.name}
              </label>
            ))}
          </div>

          <button onClick={createDrive} style={{ ...s.primaryBtn, marginTop: 8 }}>
            🚀 Publish Drive & Notify Eligible Students
          </button>
        </div>
      )}

      {/* ── APPLICANTS ── */}
      {tab === 'applicants' && (
        !selectedDrive ? (
          <div style={s.empty}>
            <span style={{ fontSize: '3rem' }}>👆</span>
            <p>Select a drive from the Drives tab to view its applicants.</p>
          </div>
        ) : (
          <div>
            {/* Bulk action bar */}
            <div style={s.appsHeader}>
              <div>
                <h3 style={{ margin: 0, color: '#E5E7EB', fontSize: '1.05rem' }}>
                  {selectedDrive.company_name} — {selectedDrive.job_role}
                </h3>
                <span style={{ color: '#6B7280', fontSize: '0.8rem' }}>
                  {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
                </span>
              </div>
              {selected.length > 0 && (
                <div style={s.bulkBar}>
                  <span style={{ color: '#6B7280', fontSize: '0.82rem' }}>{selected.length} selected</span>
                  {STATUS_OPTS.map(st => (
                    <button key={st} onClick={() => bulkUpdate(st)}
                      style={{ ...s.bulkBtn, borderColor: (STATUS_STYLES[st]?.color || '#6B7280') + '55', color: STATUS_STYLES[st]?.color || '#6B7280' }}>
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {appsLoading ? <Loader color="#2563EB"/> :
              applicants.length === 0 ? (
                <div style={s.empty}><p>No applications yet for this drive.</p></div>
              ) : (
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}><input type="checkbox" checked={selected.length === applicants.length && applicants.length > 0} onChange={selectAll}/></th>
                        {['Name', 'Roll No.', 'Dept', 'CGPA', 'Mobile', 'Resume', 'Applied', 'Status', 'Update'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {applicants.map(app => {
                        const sc = STATUS_STYLES[app.status] || STATUS_STYLES.Applied;
                        return (
                          <tr key={app.application_id} style={selected.includes(app.application_id) ? s.trSelected : {}}>
                            <td style={s.td}>
                              <input type="checkbox" checked={selected.includes(app.application_id)}
                                onChange={() => toggleSelect(app.application_id)}/>
                            </td>
                            <td style={s.td}><strong style={{ color: '#E5E7EB' }}>{app.name}</strong></td>
                            <td style={s.td}><code style={{ color: '#A78BFA', fontSize: '0.78rem' }}>{app.roll_number}</code></td>
                            <td style={s.td}>{app.department_name}</td>
                            <td style={s.td}>
                              <span style={{ color: app.cgpa >= 8 ? '#34D399' : app.cgpa >= 6 ? '#FBBF24' : '#F87171', fontWeight: 700 }}>{app.cgpa}</span>
                            </td>
                            <td style={s.td}>{app.mobile || '—'}</td>
                            <td style={s.td}>
                              {app.resume_url
                                ? <a href={app.resume_url} target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontSize: '0.8rem' }}>View ↗</a>
                                : '—'}
                            </td>
                            <td style={s.td}>{new Date(app.applied_at).toLocaleDateString()}</td>
                            <td style={s.td}>
                              <span style={{ ...s.pill, background: sc.bg, color: sc.color }}>{app.status}</span>
                            </td>
                            <td style={s.td}>
                              <select style={s.miniSelect} value={app.status}
                                onChange={e => updateStatus(app.application_id, e.target.value)}>
                                {STATUS_OPTS.map(o => <option key={o}>{o}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )
      )}

      {/* ── EXPORT ── */}
      {tab === 'export' && (
        <div style={s.formCard}>
          <h3 style={s.formTitle}>Export HR Report to Excel</h3>
          <label style={s.label}>Select Drive
            <select style={s.input} value={exportDriveId} onChange={e => setExportDriveId(e.target.value)}>
              <option value="">— Choose a placement drive —</option>
              {drives.map(d => <option key={d.id} value={d.id}>{d.company_name} – {d.job_role}</option>)}
            </select>
          </label>

          <label style={{...s.label, marginTop: 16}}>Export Filter (Application Status)
            <select style={s.input} value={exportStatus} onChange={e => setExportStatus(e.target.value)}>
              <option value="">All Applications</option>
              {STATUS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>

          <div style={{ marginTop: 24, marginBottom: 16, padding: 16, background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed rgba(59, 130, 246, 0.3)', borderRadius: 8 }}>
            <label style={{ ...s.label, marginBottom: 8, color: '#3B82F6' }}>📂 Upload HR Template (Auto-map columns)</label>
            <input type="file" accept=".xlsx, .xls" onChange={handleTemplateUpload} disabled={uploadingTemplate} style={{ color: '#E5E7EB' }} />
            {uploadingTemplate && <span style={{ marginLeft: 12, color: '#9CA3AF', fontSize: '0.85rem' }}>Parsing...</span>}
          </div>

          <div style={s.sectionLabel}>Columns to export</div>
          <div style={s.chips}>
            {exportFields.map(f => (
              <label key={f} style={{ ...s.chipLabel, ...s.chipActive }}>
                {f} <button onClick={() => toggleExportField(f)} style={{ background: 'transparent', border: 'none', color: '#FFF', marginLeft: 6, cursor: 'pointer', outline: 'none' }}>×</button>
              </label>
            ))}
            {/* Show remaining known fields as inactive chips to allow manual selection */}
            {ALL_EXPORT_FIELDS.filter(f => !exportFields.includes(f)).map(f => (
              <label key={f} style={s.chipLabel}>
                <input type="checkbox" style={{ display: 'none' }} onChange={() => toggleExportField(f)} />
                + {f}
              </label>
            ))}
          </div>
          <button onClick={exportExcel} style={{ ...s.primaryBtn, marginTop: 24, background: 'linear-gradient(135deg,#10B981,#059669)' }}>
            ⬇ Download Excel Report (.xlsx)
          </button>
        </div>
      )}

      {tab === 'faculty' && (
        <div style={s.formCard} className="animate-fade-in">
          <h2 style={s.formTitle}>Appoint Faculty Coordinator</h2>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 20 }}>
            The Faculty member will receive an OTP to set their own password on first login — no password needed here.
          </p>
          <form onSubmit={createFaculty}>
            <div style={s.formGrid}>
              <label style={s.label}>
                Full Name
                <input required type="text" style={s.input} value={facultyForm.name} onChange={e => setFacultyForm({...facultyForm, name: e.target.value})} placeholder="Prof. Sharma" />
              </label>
              <label style={s.label}>
                Email Address
                <input required type="email" style={s.input} value={facultyForm.email} onChange={e => setFacultyForm({...facultyForm, email: e.target.value})} placeholder="sharma@institute.edu" />
              </label>
              <label style={s.label}>
                Phone Number (Optional)
                <input type="tel" style={s.input} value={facultyForm.phone} onChange={e => setFacultyForm({...facultyForm, phone: e.target.value})} placeholder="+91 9876543210" />
              </label>
              <label style={s.label}>
                Assign Class
                <select required style={s.input} value={facultyForm.class_id} onChange={e => setFacultyForm({...facultyForm, class_id: e.target.value})}>
                  <option value="">— Select Class —</option>
                  {hierarchy.flatMap(p => p.departments).flatMap((d: any) => d.classes).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" style={{ ...s.primaryBtn, width: '100%' }} disabled={loading}>
              {loading ? 'Appointing...' : '✅ Appoint Faculty (OTP Login on First Use)'}
            </button>
          </form>
        </div>
      )}

      {/* ── FACULTY CREATION ── */}
      {tab === 'faculty' && (
        <div style={s.formCard} className="animate-fade-in">
          <h2 style={s.formTitle}>Appoint Faculty Coordinator</h2>
          <form onSubmit={createFaculty}>
            <div style={s.formGrid}>
              <label style={s.label}>
                Full Name
                <input required type="text" style={s.input} value={facultyForm.name} onChange={e => setFacultyForm({...facultyForm, name: e.target.value})} placeholder="Prof. Sharma" />
              </label>
              <label style={s.label}>
                Email Address
                <input required type="email" style={s.input} value={facultyForm.email} onChange={e => setFacultyForm({...facultyForm, email: e.target.value})} placeholder="sharma@institute.edu" />
              </label>
              <label style={s.label}>
                Password
                <input required type="password" style={s.input} value={facultyForm.password} onChange={e => setFacultyForm({...facultyForm, password: e.target.value})} placeholder="Set Faculty Password" />
              </label>
              <label style={s.label}>
                Phone Number (Optional)
                <input type="tel" style={s.input} value={facultyForm.phone} onChange={e => setFacultyForm({...facultyForm, phone: e.target.value})} placeholder="+91 9876543210" />
              </label>
              <label style={{...s.label, gridColumn: 'span 2'}}>
                Assign Class
                <select required style={s.input} value={facultyForm.class_id} onChange={e => setFacultyForm({...facultyForm, class_id: e.target.value})}>
                  <option value="">— Select Class —</option>
                  {hierarchy.flatMap(p => p.departments).flatMap((d: any) => d.classes).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" style={{ ...s.primaryBtn, width: '100%' }} disabled={loading}>
              {loading ? 'Appointing...' : 'Appoint Faculty'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

/* Loader */
const Loader: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6B7280', justifyContent: 'center', padding: 80 }}>
    <div style={{ width: 24, height: 24, border: `3px solid ${color}33`, borderTop: `3px solid ${color}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
    Loading…
  </div>
);

const s: Record<string, React.CSSProperties> = {
  wrap: { color: '#111827', maxWidth: 1300, margin: '0 auto' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: '1.7rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#2563EB,#6366F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { color: '#6B7280', fontSize: '0.875rem', marginTop: 6 },
  ghostBtn: { background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)', color: '#2563EB', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem' },
  toastOk: { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#059669', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: '0.875rem' },
  toastErr: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: '0.875rem' },
  tabNav: { display: 'flex', gap: 4, background: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 10, marginBottom: 28, width: 'fit-content' },
  tabBtn: { background: 'none', border: 'none', color: '#6B7280', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' },
  tabActive: { background: 'rgba(37,99,235,0.15)', color: '#2563EB' },
  driveGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 },
  driveCard: { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  cardDim: { opacity: 0.6 },
  driveTop: { display: 'flex', alignItems: 'center', gap: 14 },
  avatar: { width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#2563EB,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800, color: '#fff', flexShrink: 0 },
  company: { fontWeight: 700, color: '#111827', fontSize: '1rem' },
  role: { color: '#6B7280', fontSize: '0.82rem', marginTop: 2 },
  pill: { padding: '3px 10px', borderRadius: 20, fontSize: '0.74rem', fontWeight: 700, flexShrink: 0 },
  driveStats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  statBox: { background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '10px 6px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 },
  statLabel: { fontSize: '0.7rem', color: '#6B7280' },
  driveFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  appsBtn: { background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', color: '#2563EB', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', color: '#6B7280', textAlign: 'center', gap: 12 },
  formCard: { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 32, maxWidth: 900 },
  formTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 24px 0' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: '#4B5563', fontWeight: 600 },
  input: { background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '9px 12px', color: '#111827', fontSize: '0.875rem', outline: 'none', marginTop: 4 },
  sectionLabel: { fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '20px 0 10px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chipLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#6B7280', cursor: 'pointer', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, padding: '6px 12px', transition: 'all 0.15s' },
  chipActive: { background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#2563EB' },
  primaryBtn: { background: 'linear-gradient(135deg,#2563EB,#6366F1)', border: 'none', color: '#fff', padding: '11px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' },
  appsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  bulkBar: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  bulkBtn: { background: 'none', border: '1px solid', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.855rem' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '0.72rem', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap' },
  td: { padding: '11px 12px', color: '#4B5563', borderBottom: '1px solid rgba(0,0,0,0.04)' },
  trSelected: { background: 'rgba(37,99,235,0.05)' },
  miniSelect: { background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, padding: '4px 8px', color: '#111827', fontSize: '0.78rem', cursor: 'pointer' },
};
