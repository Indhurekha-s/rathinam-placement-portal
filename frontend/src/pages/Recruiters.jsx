import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, CheckCircle, RefreshCw, AlertCircle, Building2 } from 'lucide-react';

export default function Recruiters({ user }) {
  const navigate = useNavigate();
  const [activeDrives, setActiveDrives] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch active drives and recruiters
      const response = await fetch('/api/recruiters/active', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load recruiter drives');
      setActiveDrives(data.activeDrives || []);
      setRecruiters(data.recruitersList || []);

      // Fetch students for talent pool
      const responseStudents = await fetch('/api/students', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const dataStudents = await responseStudents.json();
      if (responseStudents.ok) setStudents(dataStudents);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'var(--font-title)' }}>Recruitment & Talent Center</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Browse active corporate recruiter profiles and review qualified student eligibility pools (View-Only).
          </p>
        </div>
        <button onClick={fetchData} className="btn btn-secondary">
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '12px', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      {/* Recruiters accounts mapping */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '14px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
          Corporate Recruiter Access Accounts
        </h3>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Recruiter Name</th>
                <th>Company Client</th>
                <th>Drive Date</th>
                <th>CTC (LPA)</th>
                <th>Staff Officer Liaison</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Loading recruiters...</td>
                </tr>
              ) : recruiters.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No recruiter accounts matched.</td>
                </tr>
              ) : (
                recruiters.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '600', color: '#fff' }}>{r.name}</td>
                    <td>{r.company_name}</td>
                    <td>{r.drive_date || 'TBD'}</td>
                    <td style={{ fontWeight: 'bold' }}>{r.ctc} LPA</td>
                    <td>{r.assigned_member_name}</td>
                    <td>
                      <span className={`badge badge-${r.company_status?.toLowerCase().replace(/ /g, '-')}`}>
                        {r.company_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Talent Pool (View-Only Resume Board) */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '14px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
          Candidate Qualification & Resume Dashboard
        </h3>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Department</th>
                <th>UG CGPA (%)</th>
                <th>ATS Compatibility</th>
                <th>Skills Set</th>
                <th>Resume</th>
                <th>Profile</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Loading student profiles...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No candidates registered.</td>
                </tr>
              ) : (
                students.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{s.roll_number}</td>
                    <td style={{ color: '#fff', fontWeight: '600' }}>{s.name}</td>
                    <td>{s.department}</td>
                    <td>{s.ug_percent}%</td>
                    <td style={{ fontWeight: '700', color: s.ats_score >= 80 ? 'var(--brand-green)' : 'var(--brand-orange)' }}>
                      {s.ats_score || 0}%
                    </td>
                    <td>
                      <div style={{ 
                        maxWidth: '240px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)'
                      }} title={s.skills}>
                        {s.skills || 'None listed'}
                      </div>
                    </td>
                    <td>
                      <a 
                        href={`${s.resume_link}`} 
                        download
                        style={{ color: 'var(--brand-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600' }}
                      >
                        <FileText size={14} />
                        <span>Resume</span>
                      </a>
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/students/${s.id}`)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <Eye size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
