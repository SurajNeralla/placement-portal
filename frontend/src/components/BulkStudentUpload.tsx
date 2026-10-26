import React, { useState, useRef, useEffect } from 'react';

interface Props {
  token: string;
  institutionId: string;
  onUploadSuccess: () => void;
}

const API = 'http://localhost:8000/api';

export const BulkStudentUpload: React.FC<Props> = ({ token, institutionId, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{inserted: number, updated: number} | null>(null);
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [targetType, setTargetType] = useState<'class' | 'program'>('class');
  const [selectedTarget, setSelectedTarget] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        const res = await fetch(`${API}/institutions/${institutionId}/hierarchy`);
        if (res.ok) {
          const data = await res.json();
          setHierarchy(data.hierarchy || []);
        }
      } catch {}
    };
    if (institutionId) loadHierarchy();
  }, [institutionId]);

  const allClasses = hierarchy.flatMap((prog: any) =>
    prog.departments.flatMap((dept: any) =>
      dept.classes.map((cls: any) => ({
        id: cls.id,
        label: `${prog.name} → ${dept.name} → ${cls.name}`,
      }))
    )
  );

  const allPrograms = hierarchy.map((prog: any) => ({
    id: prog.id,
    label: prog.name,
  }));

  const handleUploadClick = () => {
    if (!selectedTarget) {
      setError(`Please select a target ${targetType} before uploading.`);
      return;
    }
    setError('');
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_type', targetType);
    formData.append('target_id', selectedTarget);

    try {
      const res = await fetch(`${API}/students/bulk-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setResult({ inserted: data.inserted, updated: data.updated });
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16,
      padding: 28, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#2563EB,#6366F1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0
        }}>📤</div>
        <div>
          <h3 style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: '1rem' }}>Bulk Upload Students</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
            Upload Google Form Excel (.xlsx) responses — students go to Faculty for verification
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', cursor: 'pointer' }}>
              <input type="radio" name="targetType" checked={targetType === 'class'} onChange={() => { setTargetType('class'); setSelectedTarget(''); }} />
              Upload to specific Class
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', cursor: 'pointer' }}>
              <input type="radio" name="targetType" checked={targetType === 'program'} onChange={() => { setTargetType('program'); setSelectedTarget(''); }} />
              Upload for entire Program
            </label>
          </div>
          <select
            value={selectedTarget}
            onChange={e => setSelectedTarget(e.target.value)}
            style={{
              width: '100%', background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 8, padding: '9px 12px', color: selectedTarget ? '#111827' : '#9CA3AF',
              fontSize: '0.875rem', outline: 'none'
            }}
          >
            <option value="">— Select a {targetType} —</option>
            {targetType === 'class' ? allClasses.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.label}</option>
            )) : allPrograms.map(prog => (
              <option key={prog.id} value={prog.id}>{prog.label}</option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            style={{
              background: uploading ? '#9CA3AF' : 'linear-gradient(135deg,#2563EB,#6366F1)',
              border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 10,
              cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap'
            }}
          >
            {uploading ? '⏳ Uploading...' : '📤 Upload Excel File'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', borderRadius: 8, fontSize: '0.84rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: 12, padding: '10px 14px', background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)', color: '#059669', borderRadius: 8, fontSize: '0.84rem'
        }}>
          ✅ Uploaded <strong>{result.inserted + result.updated}</strong> students to pending queue
          ({result.inserted} new, {result.updated} updated) — awaiting Faculty verification.
        </div>
      )}
    </div>
  );
};
