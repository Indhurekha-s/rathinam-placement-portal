import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Globe, ExternalLink, RefreshCw } from 'lucide-react';

export default function Companies({ user }) {
  const isAdmin = user?.role === 'Admin';
  const isMember = user?.role === 'Placement Team Member';
  const isManager = user?.role === 'Manager';
  const isRecruiter = user?.role === 'Recruiter';

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals / Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '', location: '', website: '', contact_name: '',
    contact_mobile: '', contact_email: '', size: '', status: 'COLD',
    address: '', ctc: '', drive_date: ''
  });

  const fetchCompanies = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch companies');
      setCompanies(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingId ? `/api/companies/${editingId}` : '/api/companies';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Operation failed');
      alert(editingId ? 'Company updated successfully' : 'Company added successfully');
      setShowForm(false);
      setEditingId(null);
      setForm({
        name: '', location: '', website: '', contact_name: '',
        contact_mobile: '', contact_email: '', size: '', status: 'COLD',
        address: '', ctc: '', drive_date: ''
      });
      fetchCompanies();
    } catch (err) {
      alert(err.message);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({
      name: c.name, location: c.location, website: c.website || '',
      contact_name: c.contact_name || '', contact_mobile: c.contact_mobile || '',
      contact_email: c.contact_email || '', size: c.size || '', status: c.status,
      address: c.address || '', ctc: c.ctc || '', drive_date: c.drive_date || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete company '${name}'?`)) return;
    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Deletion failed');
      alert(data.message);
      fetchCompanies();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'var(--font-title)' }}>Company Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Manage the list of corporate partners, HR contact information, and placement statuses.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {(isAdmin || isMember) && (
            <button onClick={() => { setShowForm(true); setEditingId(null); }} className="btn btn-primary">
              <Plus size={16} />
              <span>Add Company</span>
            </button>
          )}
          <button onClick={fetchCompanies} className="btn btn-secondary">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '12px', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      {/* Main Database Table */}
      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Location</th>
                <th>HR Contact</th>
                <th>Size</th>
                <th>CTC (LPA)</th>
                <th>Drive Date</th>
                <th>Assigned Member</th>
                <th>Status</th>
                {(!isManager && !isRecruiter) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>Loading companies...</td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No companies recorded in directory.
                  </td>
                </tr>
              ) : (
                companies.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: '#fff', fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{c.name}</span>
                        {c.website && (
                          <a href={`https://${c.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-blue)' }}>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td>{c.location}</td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        <div style={{ color: '#fff', fontWeight: '500' }}>{c.contact_name || 'N/A'}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{c.contact_email || ''}</div>
                      </div>
                    </td>
                    <td>{c.size ? c.size.toLocaleString() : 'N/A'}</td>
                    <td style={{ fontWeight: '700' }}>{c.ctc} LPA</td>
                    <td>{c.drive_date || 'TBD'}</td>
                    <td>
                      <span style={{ color: 'var(--brand-blue)', fontWeight: '500' }}>
                        {c.assigned_member_name || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${c.status.toLowerCase().replace(/ /g, '-')}`}>
                        {c.status}
                      </span>
                    </td>
                    {(!isManager && !isRecruiter) && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => startEdit(c)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            title="Edit details"
                          >
                            <Edit2 size={12} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(c.id, c.name)}
                              className="btn btn-danger"
                              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                              title="Delete company drive"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Company Dialog Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(5,7,18,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '28px', background: 'rgba(20,26,46,0.95)', overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>
                {editingId ? 'Edit Company Profile' : 'Add Corporate Partner'}
              </h3>
              <button 
                onClick={() => { setShowForm(false); setEditingId(null); }} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input required type="text" className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. TCS" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Headquarters / Location</label>
                  <input required type="text" className="form-input" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="e.g. Chennai" />
                </div>
                <div className="form-group">
                  <label className="form-label">Offered CTC (LPA)</label>
                  <input required type="number" step="0.1" className="form-input" value={form.ctc} onChange={(e) => setForm({...form, ctc: e.target.value})} placeholder="e.g. 5.5" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Website Domain</label>
                  <input type="text" className="form-input" value={form.website} onChange={(e) => setForm({...form, website: e.target.value})} placeholder="e.g. www.wipro.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Corporate Size (Employees)</label>
                  <input type="number" className="form-input" value={form.size} onChange={(e) => setForm({...form, size: e.target.value})} placeholder="e.g. 1500" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Drive Date</label>
                  <input type="date" className="form-input" value={form.drive_date} onChange={(e) => setForm({...form, drive_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Placement Phase Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                    <option value="COLD">COLD (Hidden from Recruiters)</option>
                    <option value="WARM">WARM (Pending Schedule)</option>
                    <option value="HOT">HOT (Active Hiring)</option>
                    <option value="DRIVE COMPLETED">DRIVE COMPLETED</option>
                  </select>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600', marginBottom: '10px' }}>HR Contact Person Coordinates</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Name</label>
                    <input type="text" className="form-input" value={form.contact_name} onChange={(e) => setForm({...form, contact_name: e.target.value})} placeholder="John Doe" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">HR Mobile</label>
                    <input type="text" className="form-input" value={form.contact_mobile} onChange={(e) => setForm({...form, contact_mobile: e.target.value})} placeholder="984..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">HR Email</label>
                    <input type="email" className="form-input" value={form.contact_email} onChange={(e) => setForm({...form, contact_email: e.target.value})} placeholder="hr@..." />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Company Address Details</label>
                <textarea className="form-textarea" rows="2" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} placeholder="Full physical office location address..."></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
