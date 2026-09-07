import React, { useState, useEffect } from 'react';
import { RefreshCw, UserCheck, Briefcase, Plus, Edit } from 'lucide-react';

export default function Placement({ user }) {
  const isAdmin = user?.role === 'Admin';
  
  const [members, setMembers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reassignment form states
  const [showAssign, setShowAssign] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch members
      const resMembers = await fetch('/api/placement/members', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const dataMembers = await resMembers.json();
      if (!resMembers.ok) throw new Error(dataMembers.error || 'Failed to load team members');
      setMembers(dataMembers);

      // Fetch companies
      const resCompanies = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const dataCompanies = await resCompanies.json();
      if (!resCompanies.ok) throw new Error(dataCompanies.error || 'Failed to load companies');
      setCompanies(dataCompanies);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReassign = async (e) => {
    e.preventDefault();
    if (!selectedCompanyId || !selectedMemberId) {
      alert('Please select both company and placement member');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ assigned_member_id: parseInt(selectedMemberId) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Reassignment failed');
      alert('Placement Member assigned successfully!');
      setShowAssign(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'var(--font-title)' }}>Placement Team Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Monitor placement member drives, assign company accounts, and coordinate scheduled recruitment rounds.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && (
            <button onClick={() => setShowAssign(true)} className="btn btn-primary">
              <UserCheck size={16} />
              <span>Assign Drive Member</span>
            </button>
          )}
          <button onClick={fetchData} className="btn btn-secondary">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '12px', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      {/* Grid: Placement Members (1-10) cards */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={18} color="var(--brand-orange)" />
          <span>Placement Officers (Member 1-10)</span>
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>Loading team metrics...</div>
        ) : (
          <div className="grid-cols-auto-fit">
            {members.map(member => (
              <div key={member.id} className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: 'rgba(27,155,227,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-blue)',
                    fontWeight: 'bold'
                  }}>
                    M{member.id}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#fff' }}>{member.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.email}</span>
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '8px', 
                  fontSize: '0.8rem', 
                  borderTop: '1px solid var(--border-glass)',
                  paddingTop: '10px',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Handled</div>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '1rem' }}>{member.total_companies_handled}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Active</div>
                    <div style={{ fontWeight: '700', color: 'var(--brand-orange)', fontSize: '1rem' }}>{member.active_drives}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Done</div>
                    <div style={{ fontWeight: '700', color: 'var(--brand-green)', fontSize: '1rem' }}>{member.completed_drives}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Table: Assigned Companies Drives */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '14px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
          Company Assignment Matrix
        </h3>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Location</th>
                <th>CTC (LPA)</th>
                <th>Drive Date</th>
                <th>Assigned Officer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: '600', color: '#fff' }}>{c.name}</td>
                  <td>{c.location}</td>
                  <td>{c.ctc} LPA</td>
                  <td>{c.drive_date || 'Not set'}</td>
                  <td style={{ fontWeight: '600', color: 'var(--brand-blue)' }}>
                    {c.assigned_member_name ? c.assigned_member_name : 'Unassigned'}
                  </td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase().replace(/ /g, '-')}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Dialog Modal */}
      {showAssign && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(5,7,18,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '28px', background: 'rgba(20,26,46,0.95)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Assign Drive Officer</h3>
              <button onClick={() => setShowAssign(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
            </div>

            <form onSubmit={handleReassign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Select Company</label>
                <select className="form-select" value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)} required>
                  <option value="">-- Choose Company --</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign to Placement Member</label>
                <select className="form-select" value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} required>
                  <option value="">-- Choose Member --</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%' }}>
                {saving ? 'Saving...' : 'Confirm Assignment'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
