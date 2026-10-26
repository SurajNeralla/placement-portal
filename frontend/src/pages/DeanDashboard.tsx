import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://127.0.0.1:8000/api';

interface DeanDashboardProps {
  token: string;
  institutionId: string;
  userName: string;
}

type Tab = 'overview' | 'drives' | 'students' | 'staff';

export const DeanDashboard: React.FC<DeanDashboardProps> = ({ token, institutionId, userName }) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [deptStats, setDeptStats] = useState<any[]>([]);
  const [progStats, setProgStats] = useState<any[]>([]);
  const [drives, setDrives] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilters, setStudentFilters] = useState<any>({});
  const [showTpoModal, setShowTpoModal] = useState(false);
  const [tpoForm, setTpoForm] = useState({ name: '', email: '', password: '', phone: '', program_id: '' });
  const [tpoError, setTpoError] = useState('');
  const [tpoLoading, setTpoLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsR, deptR, progR, drivesR, studentsR, staffR, hierR] = await Promise.all([
        fetch(`${API}/dean/stats`, { headers }),
        fetch(`${API}/dean/stats/by-department`, { headers }),
        fetch(`${API}/dean/stats/by-program`, { headers }),
        fetch(`${API}/dean/drives`, { headers }),
        fetch(`${API}/dean/students`, { headers }),
        fetch(`${API}/dean/users`, { headers }),
        fetch(`${API}/institutions/${institutionId}/hierarchy`),
      ]);
      if (statsR.ok) setStats(await statsR.json());
      if (deptR.ok) setDeptStats(await deptR.json());
      if (progR.ok) setProgStats(await progR.json());
      if (drivesR.ok) setDrives(await drivesR.json());
      if (studentsR.ok) setStudents(await studentsR.json());
      if (staffR.ok) setStaff(await staffR.json());
      if (hierR.ok) setHierarchy((await hierR.json()).hierarchy || []);
    } finally {
      setLoading(false);
    }
  }, [token, institutionId]);

  useEffect(() => { load(); }, [load]);

  const filteredStudents = students.filter(s => {
    const q = studentSearch.toLowerCase();
    const matchesSearch = !q || s.name?.toLowerCase().includes(q) ||
      s.roll_number?.toLowerCase().includes(q) ||
      s.department_name?.toLowerCase().includes(q) ||
      s.emails?.institute?.toLowerCase().includes(q) ||
      s.emails?.personal?.toLowerCase().includes(q);
    const matchesDept = !studentFilters.dept || s.department_name === studentFilters.dept;
    const matchesProg = !studentFilters.program || s.program_name === studentFilters.program;
    const matchesStatus = !studentFilters.status || s.status === studentFilters.status;
    const matchesCgpa = !studentFilters.cgpa || (
      studentFilters.cgpa === '9+' ? s.cgpa >= 9 :
      studentFilters.cgpa === '8+' ? s.cgpa >= 8 :
      studentFilters.cgpa === '7+' ? s.cgpa >= 7 :
      studentFilters.cgpa === '6+' ? s.cgpa >= 6 :
      studentFilters.cgpa === '<6' ? s.cgpa < 6 : true
    );
    return matchesSearch && matchesDept && matchesProg && matchesStatus && matchesCgpa;
  });

  const handleCreateTpo = async (e: React.FormEvent) => {
    e.preventDefault();
    setTpoError('');
    setTpoLoading(true);
    try {
      const res = await fetch(`${API}/institutions/tpo`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(tpoForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create TPO');
      setShowTpoModal(false);
      setTpoForm({ name: '', email: '', password: '', phone: '', program_id: '' });
      load();
    } catch (err: any) {
      setTpoError(err.message);
    } finally {
      setTpoLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen font-body-md">
      {/* TopNavBar */}
      <header className="flex justify-between items-center w-full px-lg h-16 z-50 bg-surface-container-lowest border-b border-outline-variant fixed top-0">
        <div className="flex items-center gap-md">
          <img src="/logo.png" alt="PlacementHub Logo" className="h-[55px] object-contain" />
          <div className="hidden md:flex ml-lg items-center bg-surface-container-high px-md py-xs rounded-lg gap-sm text-on-surface-variant focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all">
            <span className="material-symbols-outlined text-[20px]">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-body-md w-64 outline-none" placeholder="Search students, companies..." type="text"/>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <div className="hidden md:flex items-center gap-sm">
            <button className="px-md py-sm text-label-md font-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg">Inbox</button>
          </div>
          <div className="flex items-center gap-sm">
            <button className="p-sm text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-full">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary-container overflow-hidden ml-sm cursor-pointer border border-outline-variant flex items-center justify-center text-white font-bold text-xs">
              {userName?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar */}
      <aside className="hidden lg:flex flex-col h-screen fixed left-0 top-0 pt-16 w-[260px] bg-surface-container-low border-r border-outline-variant z-40">
        <div className="p-lg flex flex-col gap-xs mb-md">
          <div className="flex items-center gap-md">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined">school</span>
            </div>
            <div>
              <h3 className="text-label-md font-bold text-on-surface">Institution Portal</h3>
              <p className="text-body-sm text-on-surface-variant">Enterprise Admin</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-md space-y-1">
          <SidebarItem icon="dashboard" label="Dashboard" active={tab === 'overview'} onClick={() => setTab('overview')} />
          <SidebarItem icon="group" label="Students" active={tab === 'students'} onClick={() => setTab('students')} />
          <SidebarItem icon="school" label="Staff" active={tab === 'staff'} onClick={() => setTab('staff')} />
          <SidebarItem icon="business_center" label="Placement Drives" active={tab === 'drives'} onClick={() => setTab('drives')} />
        </nav>
        
        <div className="p-lg border-t border-outline-variant">
          <button onClick={() => setShowTpoModal(true)} className="w-full bg-primary text-on-primary py-sm rounded-lg text-label-md font-semibold hover:bg-primary/90 transition-shadow active:scale-95 duration-150 shadow-sm">
            Appoint TPO
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="lg:ml-[260px] pt-24 px-lg pb-24">
        <div className="max-w-container-max mx-auto">
          
          <div className="flex justify-between items-end mb-xl">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Dean's Dashboard</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Campus Placement Overview & Strategic Analytics</p>
            </div>
            <div className="flex gap-sm">
              <button onClick={load} className="flex items-center gap-xs px-md py-sm bg-surface-container-lowest border border-outline-variant text-label-md font-semibold rounded-lg hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
             <div className="flex items-center justify-center py-20 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-primary mr-2">autorenew</span>
                Loading analytics...
             </div>
          ) : (
            <>
              {tab === 'overview' && stats && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-lg mb-2xl">
                    <KpiCard title="Total Students" value={stats.students.total} sub={`${stats.students.verified} verified`} />
                    <KpiCard title="Placed Students" value={stats.applications.placed} sub="Batch 2024" />
                    <KpiCard title="Placement %" value={`${stats.placement_rate_percent}%`} highlight={true} progress={stats.placement_rate_percent} />
                    <KpiCard title="Placement Drives" value={stats.drives.total} sub={`${stats.drives.active} active`} />
                    <KpiCard title="Staff Members" value={stats.staff.tpos + stats.staff.faculty} sub="TPOs & Faculty" />
                    <KpiCard title="Total Applicants" value={stats.applications.total} sub="Across all drives" />
                  </div>

                  <div className="bento-grid mb-2xl">
                    {/* Department Breakdown */}
                    <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest p-xl rounded-xl card-shadow">
                      <div className="mb-lg">
                        <h2 className="text-headline-sm font-headline-sm text-on-surface">Department-wise Breakdown</h2>
                        <p className="text-body-sm text-on-surface-variant">Placement Rate by Department</p>
                      </div>
                      <div className="space-y-lg">
                        {deptStats.length === 0 ? <p className="text-body-sm text-on-surface-variant">No data.</p> : deptStats.map(d => (
                          <div key={d.department_id} className="space-y-xs">
                            <div className="flex justify-between items-center text-label-md">
                              <span className="font-bold text-on-surface">{d.department_name}</span>
                              <span className="text-primary font-semibold">{d.placement_rate}% ({d.placed}/{d.total_students})</span>
                            </div>
                            <div className="h-2 w-full bg-surface-container-high rounded-full flex overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${d.placement_rate}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Program Breakdown */}
                    <div className="col-span-12 lg:col-span-5 bg-surface-container-lowest p-xl rounded-xl card-shadow overflow-x-auto">
                      <div className="mb-lg">
                        <h2 className="text-headline-sm font-headline-sm text-on-surface">Program Summary</h2>
                      </div>
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-outline-variant text-label-md text-on-surface-variant uppercase">
                            <th className="pb-sm font-medium">Program</th>
                            <th className="pb-sm font-medium text-center">Students</th>
                            <th className="pb-sm font-medium text-center">Placed</th>
                            <th className="pb-sm font-medium text-center">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                          {progStats.map(p => (
                            <tr key={p.program_id} className="text-body-sm">
                              <td className="py-sm font-semibold">{p.program_name}</td>
                              <td className="py-sm text-center">{p.total_students}</td>
                              <td className="py-sm text-center text-green-600 font-bold">{p.placed}</td>
                              <td className="py-sm text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${p.placement_rate > 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {p.placement_rate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-12 gap-lg">
                    {/* Recent Drives */}
                    <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl card-shadow overflow-hidden">
                      <div className="px-xl py-lg border-b border-outline-variant flex justify-between items-center">
                        <h2 className="text-headline-sm font-headline-sm text-on-surface">Recent Placement Drives</h2>
                        <button onClick={() => setTab('drives')} className="text-label-sm font-bold text-primary px-md py-xs rounded-full hover:bg-primary-container/10 transition-colors">View All</button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-surface-container-low/50">
                              <th className="px-xl py-md text-label-md text-on-surface-variant border-b border-outline-variant">Company</th>
                              <th className="px-xl py-md text-label-md text-on-surface-variant border-b border-outline-variant">Role</th>
                              <th className="px-xl py-md text-label-md text-on-surface-variant border-b border-outline-variant">Deadline</th>
                              <th className="px-xl py-md text-label-md text-on-surface-variant border-b border-outline-variant">Applicants</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant">
                            {drives.slice(0, 5).map(d => (
                              <tr key={d.id} className="hover:bg-surface-container-low/30 transition-colors">
                                <td className="px-xl py-md font-medium text-body-sm">{d.company_name}</td>
                                <td className="px-xl py-md text-body-sm">{d.job_role}</td>
                                <td className="px-xl py-md text-body-sm text-on-surface-variant">{new Date(d.deadline).toLocaleDateString()}</td>
                                <td className="px-xl py-md text-body-sm font-semibold">{d.applicants}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tab === 'students' && (
                <div className="bg-surface-container-lowest rounded-xl card-shadow overflow-hidden">
                  {/* Filter Bar */}
                  <div className="px-xl py-lg border-b border-outline-variant bg-surface-container-low/50">
                    <div className="flex justify-between items-center mb-md">
                      <h2 className="text-headline-sm font-headline-sm text-on-surface">Student Registry</h2>
                      <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 600 }}>{filteredStudents.length} / {students.length} students</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                      <input
                        className="bg-white border border-outline-variant rounded-lg px-md py-sm text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        placeholder="🔍 Name, roll, email..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                      />
                      <select
                        className="bg-white border border-outline-variant rounded-lg px-md py-sm text-body-sm outline-none focus:border-primary"
                        value={(studentFilters as any)?.dept || ''}
                        onChange={e => setStudentFilters((f: any) => ({ ...f, dept: e.target.value }))}
                      >
                        <option value="">All Departments</option>
                        {[...new Set(students.map(s => s.department_name).filter(Boolean))].map((d: any) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <select
                        className="bg-white border border-outline-variant rounded-lg px-md py-sm text-body-sm outline-none focus:border-primary"
                        value={(studentFilters as any)?.program || ''}
                        onChange={e => setStudentFilters((f: any) => ({ ...f, program: e.target.value }))}
                      >
                        <option value="">All Programs</option>
                        {[...new Set(students.map(s => s.program_name).filter(Boolean))].map((p: any) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <select
                        className="bg-white border border-outline-variant rounded-lg px-md py-sm text-body-sm outline-none focus:border-primary"
                        value={(studentFilters as any)?.status || ''}
                        onChange={e => setStudentFilters((f: any) => ({ ...f, status: e.target.value }))}
                      >
                        <option value="">All Statuses</option>
                        <option value="verified">Verified</option>
                        <option value="pending">Pending</option>
                      </select>
                      <select
                        className="bg-white border border-outline-variant rounded-lg px-md py-sm text-body-sm outline-none focus:border-primary"
                        value={(studentFilters as any)?.cgpa || ''}
                        onChange={e => setStudentFilters((f: any) => ({ ...f, cgpa: e.target.value }))}
                      >
                        <option value="">All CGPAs</option>
                        <option value="9+">9.0+</option>
                        <option value="8+">8.0+</option>
                        <option value="7+">7.0+</option>
                        <option value="6+">6.0+</option>
                        <option value="<6">Below 6.0</option>
                      </select>
                      {((studentFilters as any)?.dept || (studentFilters as any)?.program || (studentFilters as any)?.status || (studentFilters as any)?.cgpa) && (
                        <button
                          className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-md py-sm text-body-sm font-semibold hover:bg-red-100"
                          onClick={() => setStudentFilters({})}
                        >
                          ✕ Clear Filters
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface-container-low/50">
                          {['Name','Roll No.','Program','Department','CGPA','Backlogs','Status'].map(h=><th key={h} className="px-xl py-md text-label-md text-on-surface-variant border-b border-outline-variant">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant">
                        {filteredStudents.map(st => (
                          <tr key={st.id} className="hover:bg-surface-container-low/30 transition-colors">
                            <td className="px-xl py-md font-medium text-body-sm">{st.name}</td>
                            <td className="px-xl py-md text-body-sm text-primary font-mono text-xs">{st.roll_number}</td>
                            <td className="px-xl py-md text-body-sm">{st.program_name}</td>
                            <td className="px-xl py-md text-body-sm">{st.department_name}</td>
                            <td className="px-xl py-md text-body-sm font-bold">
                              <span style={{ color: st.cgpa >= 8 ? '#10B981' : st.cgpa >= 6 ? '#F59E0B' : '#EF4444' }}>
                                {st.cgpa?.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-xl py-md text-body-sm">{st.active_backlogs ?? '—'}</td>
                            <td className="px-xl py-md">
                              <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${st.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {st.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredStudents.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>No students match the selected filters.</div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'staff' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
                  {staff.map(u => (
                    <div key={u.id} className="bg-surface-container-lowest rounded-xl card-shadow p-lg flex items-center gap-md">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${u.role === 'TPO' ? 'bg-primary' : 'bg-green-600'}`}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-body-sm text-on-surface">{u.name}</div>
                        <div className="text-xs text-on-surface-variant mt-1">{u.email}</div>
                        <div className={`text-[10px] font-bold uppercase mt-2 w-max px-2 py-0.5 rounded ${u.role === 'TPO' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-700'}`}>
                          {u.role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {tab === 'drives' && (
                <div className="bg-surface-container-lowest rounded-xl card-shadow overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-container-low/50">
                        {['Company','Role','Package','Location','Deadline','Applicants'].map(h=><th key={h} className="px-xl py-md text-label-md text-on-surface-variant border-b border-outline-variant">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {drives.map(d => (
                        <tr key={d.id} className="hover:bg-surface-container-low/30 transition-colors">
                          <td className="px-xl py-md font-medium text-body-sm">{d.company_name}</td>
                          <td className="px-xl py-md text-body-sm">{d.job_role}</td>
                          <td className="px-xl py-md text-body-sm text-green-600 font-bold">{d.package}</td>
                          <td className="px-xl py-md text-body-sm text-on-surface-variant">{d.location}</td>
                          <td className="px-xl py-md text-body-sm text-on-surface-variant">{new Date(d.deadline).toLocaleDateString()}</td>
                          <td className="px-xl py-md text-body-sm font-semibold">{d.applicants}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* TPO Modal */}
      {showTpoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white p-xl rounded-xl w-[400px] shadow-2xl">
            <h3 className="font-headline-sm text-headline-sm mb-lg">Appoint New TPO</h3>
            {tpoError && <div className="text-error bg-error-container p-sm rounded mb-md text-sm">{tpoError}</div>}
            <form onSubmit={handleCreateTpo} className="space-y-md">
              <input required placeholder="Full Name" value={tpoForm.name} onChange={e => setTpoForm({...tpoForm, name: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-sm outline-none focus:border-primary" />
              <input required type="email" placeholder="Email Address" value={tpoForm.email} onChange={e => setTpoForm({...tpoForm, email: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-sm outline-none focus:border-primary" />
              <input required type="password" placeholder="Set TPO Password" value={tpoForm.password} onChange={e => setTpoForm({...tpoForm, password: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-sm outline-none focus:border-primary" />
              <input placeholder="Phone (Optional)" value={tpoForm.phone} onChange={e => setTpoForm({...tpoForm, phone: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-sm outline-none focus:border-primary" />
              <select required value={tpoForm.program_id} onChange={e => setTpoForm({...tpoForm, program_id: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-sm outline-none focus:border-primary">
                <option value="">Select Program to Assign</option>
                {hierarchy.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <div className="flex justify-end gap-sm mt-lg">
                <button type="button" onClick={() => setShowTpoModal(false)} className="px-md py-sm rounded-lg hover:bg-surface-container-low font-semibold">Cancel</button>
                <button type="submit" disabled={tpoLoading} className="px-md py-sm bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90">
                  {tpoLoading ? 'Appointing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: string, label: string, active: boolean, onClick: () => void }) => (
  <div onClick={onClick} className={`relative flex items-center gap-sm px-md py-sm rounded-lg group cursor-pointer select-none transition-all duration-200 ${active ? 'text-primary bg-primary-container/10' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>}
    <span className="material-symbols-outlined">{icon}</span>
    <span className={`text-label-md ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
  </div>
);

const KpiCard = ({ title, value, sub, highlight, progress }: { title: string, value: string|number, sub?: string, highlight?: boolean, progress?: number }) => (
  <div className={`bg-surface-container-lowest p-lg rounded-xl card-shadow flex flex-col justify-between ${highlight ? 'border-l-4 border-l-primary' : ''}`}>
    <span className="text-label-md font-label-md text-on-surface-variant">{title}</span>
    <div className="mt-md">
      <span className={`text-headline-md font-headline-md ${highlight ? 'text-primary' : ''}`}>{value}</span>
      {progress !== undefined && (
        <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
          <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
        </div>
      )}
      {sub && <div className="text-label-sm text-on-surface-variant mt-1">{sub}</div>}
    </div>
  </div>
);
