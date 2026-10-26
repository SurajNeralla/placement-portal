import React, { useState, useEffect } from 'react';
import { ChangePassword } from '../components/ChangePassword';

const API_BASE = 'http://127.0.0.1:8000/api';

interface StudentProfileProps {
  token: string;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ token }) => {
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showResumeBuilder, setShowResumeBuilder] = useState(false);

  // Edit fields state
  const [mobile, setMobile] = useState('');
  const [cgpa, setCgpa] = useState<number>(0.0);
  const [activeBacklogs, setActiveBacklogs] = useState<number>(0);
  const [totalBacklogs, setTotalBacklogs] = useState<number>(0);
  const [skills, setSkills] = useState('');
  const [projects, setProjects] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [instituteEmail, setInstituteEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/students/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load profile.');
      const data = await response.json();
      setProfile(data);
      
      // Initialize edit form
      setMobile(data.mobile || '');
      setCgpa(data.cgpa || 0.0);
      setActiveBacklogs(data.active_backlogs || 0);
      setTotalBacklogs(data.total_backlogs || 0);
      setSkills(data.skills?.join(', ') || '');
      setProjects(data.projects?.join(', ') || '');
      setResumeUrl(data.resume_url || '');
      setPhotoUrl(data.photo_url || '');
      setInstituteEmail(data.emails?.institute || '');
      setPersonalEmail(data.emails?.personal || '');
      setDob(data.dob || '');
      setGender(data.gender || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'resume' | 'photo') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    if (type === 'resume') setUploadingResume(true);
    else setUploadingPhoto(true);
    
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/files/upload?file_type=${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Upload failed');
      
      if (type === 'resume') {
        setResumeUrl(data.url);
        setMessage('Resume uploaded successfully! Click save profile to finalize.');
      } else {
        setPhotoUrl(data.url);
        setMessage('Passport photo uploaded! Click save profile to finalize.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingResume(false);
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const payload = {
      mobile,
      cgpa: Number(cgpa),
      active_backlogs: Number(activeBacklogs),
      total_backlogs: Number(totalBacklogs),
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      projects: projects.split(',').map(p => p.trim()).filter(Boolean),
      resume_url: resumeUrl || null,
      photo_url: photoUrl || null,
      institute_email: instituteEmail || null,
      personal_email: personalEmail || null,
      dob: dob || null,
      gender: gender || null
    };

    try {
      const response = await fetch(`${API_BASE}/students/profile/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Update request failed');
      
      setMessage(data.message || 'Changes submitted to coordinator review.');
      setEditMode(false);
      fetchProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !profile) return <div style={styles.loadingText}>Loading profile data...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Your Profile</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowResumeBuilder(true)} className="btn-secondary" style={{ ...styles.editBtn, background: '#4F46E5', color: '#fff', borderColor: '#4F46E5' }}>
            📄 Auto-Generate Resume
          </button>
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="btn-primary" style={styles.editBtn}>
              ✏️ Edit Profile
            </button>
          ) : (
            <button onClick={() => { setEditMode(false); fetchProfile(); }} className="btn-secondary" style={styles.editBtn}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Placement Congratulations Banner */}
      {profile?.placement_info && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.1))',
          border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: 16, padding: '20px 28px',
          display: 'flex', alignItems: 'center', gap: 20,
          boxShadow: '0 4px 24px rgba(16,185,129,0.15)',
        }}>
          <span style={{ fontSize: '2.8rem', lineHeight: 1 }}>🏆</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#065F46' }}>
              Congratulations! You have been placed at {profile.placement_info.company_name}
              {profile.placement_info.package ? ` — ${profile.placement_info.package}` : ''}
            </div>
            {profile.placement_info.role && (
              <div style={{ color: '#047857', fontSize: '0.9rem', marginTop: 4, fontWeight: 600 }}>
                Role: {profile.placement_info.role}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div style={styles.errorAlert}>{error}</div>}
      {message && <div style={styles.successAlert}>{message}</div>}

      {profile && (
        <div style={styles.layoutGrid}>
          {/* Left Column: Photo & Basic Details */}
          <div className="glass-card" style={styles.profileCard}>
            <div style={styles.photoContainer}>
              <img 
                src={photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                alt="Profile Avatar" 
                style={styles.profilePhoto} 
              />
              {editMode && (
                <div style={styles.photoUploadBtnRow}>
                  <label htmlFor="photo-upload" style={styles.uploadLabelBtn}>
                    {uploadingPhoto ? 'Uploading...' : 'Replace Photo'}
                  </label>
                  <input 
                    id="photo-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileUpload(e, 'photo')} 
                    style={{ display: 'none' }}
                    disabled={uploadingPhoto}
                  />
                </div>
              )}
            </div>

            <div style={styles.nameHeader}>
              <h3>{profile.name}</h3>
              <p style={styles.rollBadge}>Roll No: {profile.roll_number}</p>
              <span style={styles.classText}>{profile.program_name} {profile.department_name} ({profile.class_name})</span>
            </div>

            <div style={styles.basicMetadata}>
              {!editMode ? (
                <>
                  <p><strong>Institute Email:</strong> {profile.emails?.institute}</p>
                  <p><strong>Personal Email:</strong> {profile.emails?.personal}</p>
                  <p><strong>DOB:</strong> {profile.dob}</p>
                  <p><strong>Gender:</strong> {profile.gender}</p>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                  <div style={styles.inputGroup}>
                    <label>Institute Email</label>
                    <input type="email" value={instituteEmail} onChange={e => setInstituteEmail(e.target.value)} disabled={isLoading} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label>Personal Email</label>
                    <input type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} disabled={isLoading} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label>DOB</label>
                    <input type="date" value={dob} onChange={e => setDob(e.target.value)} disabled={isLoading} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label>Gender</label>
                    <select value={gender} onChange={e => setGender(e.target.value)} disabled={isLoading} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Edit / View Profile Form */}
          <div className="glass-card" style={styles.detailsCard}>
            <form onSubmit={handleSaveProfile} style={styles.form}>
              <h3 style={styles.sectionTitle}>Academic Records & Files</h3>
              
              <div style={styles.row}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label>Current CGPA</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={cgpa} 
                    onChange={e => setCgpa(Number(e.target.value))} 
                    disabled={true} 
                    required 
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label>Active Backlogs</label>
                  <input 
                    type="number" 
                    value={activeBacklogs} 
                    onChange={e => setActiveBacklogs(Number(e.target.value))} 
                    disabled={true} 
                    required 
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label>Total Backlogs</label>
                  <input 
                    type="number" 
                    value={totalBacklogs} 
                    onChange={e => setTotalBacklogs(Number(e.target.value))} 
                    disabled={true} 
                    required 
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label>Mobile Number</label>
                <input 
                  type="tel" 
                  value={mobile} 
                  onChange={e => setMobile(e.target.value)} 
                  disabled={!editMode} 
                  required 
                />
              </div>

              <div style={styles.inputGroup}>
                <label>Skills (Comma Separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Python, React, MongoDB" 
                  value={skills} 
                  onChange={e => setSkills(e.target.value)} 
                  disabled={!editMode} 
                />
              </div>

              <div style={styles.inputGroup}>
                <label>Projects (Comma Separated)</label>
                <textarea 
                  placeholder="e.g. PlacementHub, E-Commerce App" 
                  value={projects} 
                  onChange={e => setProjects(e.target.value)} 
                  disabled={!editMode} 
                  rows={3}
                />
              </div>

              <div style={styles.inputGroup}>
                <label>Resume Document (PDF/DOCX)</label>
                <div style={styles.resumeUploadBox}>
                  {resumeUrl ? (
                    <div style={styles.fileLinkRow}>
                      <span style={styles.fileIcon}>📄</span>
                      <a href={resumeUrl} target="_blank" rel="noopener noreferrer" style={styles.resumeLink}>
                        View Uploaded Resume
                      </a>
                    </div>
                  ) : (
                    <span style={styles.noFileText}>No resume uploaded yet.</span>
                  )}
                  
                  {editMode && (
                    <div style={{ marginTop: '10px' }}>
                      <label htmlFor="resume-upload" style={styles.uploadLabelBtn}>
                        {uploadingResume ? 'Uploading...' : 'Upload New Resume'}
                      </label>
                      <input 
                        id="resume-upload" 
                        type="file" 
                        accept=".pdf,.docx" 
                        onChange={(e) => handleFileUpload(e, 'resume')} 
                        style={{ display: 'none' }}
                        disabled={uploadingResume}
                      />
                    </div>
                  )}
                </div>
              </div>

              {editMode && (
                <div style={styles.approvalWarning}>
                  ⚠️ <strong>Notice:</strong> Saving changes will not immediately update your live profile. It sends a change request to your class Faculty Coordinator for verification.
                </div>
              )}

              {editMode && (
                <button type="submit" className="btn-primary" style={styles.saveBtn} disabled={isLoading || uploadingPhoto || uploadingResume}>
                  {isLoading ? 'Submitting...' : 'Save Profile Changes'}
                </button>
              )}
            </form>

              {profile.extra_data && Object.keys(profile.extra_data).length > 0 && (
                <div style={{ marginTop: 32, paddingTop: 28, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    📋 All Form Data
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 28px' }}>
                    {Object.entries(profile.extra_data).map(([key, val]: [string, any]) => (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{key}</span>
                        <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500, overflowWrap: 'break-word' }}>{String(val ?? '—')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
      )}

      {/* ── Change Password Section ── */}
      {!editMode && <ChangePassword token={token} />}

      {/* ── Resume Builder Modal & Printable Area ── */}
      {showResumeBuilder && profile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto'
        }}>
          {/* Controls (Hidden during print) */}
          <div style={{ padding: 20, display: 'flex', gap: 16, background: '#1F2937', color: 'white', width: '100%', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 100 }} className="print-hidden">
            <button onClick={() => window.print()} style={{ background: '#10B981', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>
              🖨️ Print / Save as PDF
            </button>
            <button onClick={() => setShowResumeBuilder(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>
              Close
            </button>
          </div>

          {/* Printable Resume Document */}
          <div id="resume-print-container" style={{
            background: 'white', width: '800px', maxWidth: '100%', minHeight: '1100px',
            margin: '20px auto', padding: '60px 80px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            color: '#111', fontFamily: 'Arial, sans-serif'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 20, marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: '2.4rem', textTransform: 'uppercase', letterSpacing: 2 }}>{profile.name}</h1>
              <p style={{ margin: '8px 0 0', fontSize: '1rem', color: '#444' }}>
                {profile.emails?.institute} | {profile.mobile} | {profile.program_name} - {profile.department_name}
              </p>
            </div>

            {/* Academics */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', color: '#222', borderBottom: '1px solid #ccc', paddingBottom: 6, marginBottom: 12 }}>Education</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong>{profile.program_name} in {profile.department_name}</strong>
                <span>CGPA: <strong>{profile.cgpa}</strong></span>
              </div>
              <div style={{ color: '#555' }}>Roll No: {profile.roll_number}</div>
            </div>

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', color: '#222', borderBottom: '1px solid #ccc', paddingBottom: 6, marginBottom: 12 }}>Technical Skills</h2>
                <p style={{ margin: 0, lineHeight: 1.6 }}>{profile.skills.join(', ')}</p>
              </div>
            )}

            {/* Projects */}
            {profile.projects && profile.projects.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', color: '#222', borderBottom: '1px solid #ccc', paddingBottom: 6, marginBottom: 12 }}>Projects</h2>
                <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                  {profile.projects.map((proj: string, i: number) => <li key={i}>{proj}</li>)}
                </ul>
              </div>
            )}

            {/* Additional Details */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', color: '#222', borderBottom: '1px solid #ccc', paddingBottom: 6, marginBottom: 12 }}>Additional Information</h2>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                {profile.gender && <li>Gender: {profile.gender}</li>}
                {profile.dob && <li>Date of Birth: {profile.dob}</li>}
              </ul>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '32px',
    alignItems: 'start',
  },
  profileCard: {
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  photoContainer: {
    position: 'relative',
    marginBottom: '20px',
  },
  profilePhoto: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #2563EB',
    boxShadow: '0 0 20px rgba(37, 99, 235, 0.2)',
  },
  photoUploadBtnRow: {
    marginTop: '10px',
  },
  uploadLabelBtn: {
    display: 'inline-block',
    background: 'rgba(37, 99, 235, 0.1)',
    border: '1px solid rgba(37, 99, 235, 0.3)',
    color: '#2563EB',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  nameHeader: {
    marginBottom: '24px',
  },
  rollBadge: {
    background: 'rgba(0, 0, 0, 0.06)',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    color: '#6B7280',
    display: 'inline-block',
    marginTop: '6px',
    marginBottom: '4px',
  },
  classText: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#2563EB',
    fontWeight: '600',
  },
  basicMetadata: {
    width: '100%',
    textAlign: 'left',
    fontSize: '0.85rem',
    color: '#6B7280',
    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detailsCard: {
    padding: '40px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    marginBottom: '10px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  resumeUploadBox: {
    background: '#F9FAFB',
    border: '1px dashed var(--border-color)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileLinkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  fileIcon: {
    fontSize: '1.4rem',
  },
  resumeLink: {
    color: '#2563EB',
    fontSize: '0.9rem',
    textDecoration: 'underline',
  },
  noFileText: {
    color: '#6B7280',
    fontSize: '0.85rem',
  },
  approvalWarning: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    color: '#D97706',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '0.82rem',
    lineHeight: '1.5',
  },
  saveBtn: {
    width: '100%',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '40px',
  },
  errorAlert: {
    background: 'rgba(220, 38, 38, 0.1)',
    border: '1px solid rgba(220, 38, 38, 0.25)',
    color: '#DC2626',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '0.85rem',
    marginBottom: '20px',
  },
  successAlert: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    color: '#059669',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '0.85rem',
    marginBottom: '20px',
  },
};
