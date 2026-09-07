import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Download, Upload, Search, Filter, Trash2, 
  RotateCcw, Eye, Edit2, AlertCircle, CheckCircle, RefreshCw 
} from 'lucide-react';

export default function Students({ user }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';

  // Tabs
  const [activeTab, setActiveTab] = useState('active'); // active, deleted

  // Data states
  const [students, setStudents] = useState([]);
  const [deletedStudents, setDeletedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters state
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [gender, setGender] = useState('');
  const [hostel, setHostel] = useState('');
  const [status, setStatus] = useState('');
  const [phase, setPhase] = useState('');

  // Import Modal state
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');

  // Create Student Modal state (simplified inline)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    roll_number: '', name: '', department: 'BSc Computer Science', gender: 'Male',
    hostel_day_scholar: 'Day Scholar', sslc_percent: '', hsc_percent: '', ug_percent: '',
    email_id: '', mobile_number: '', skills: '', year_of_graduation: 2026
  });

  // Fetch active students
  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({
        dept, gender, hostel, status, phase, search,
        deleted: 'false'
      }).toString();
      
      const response = await fetch(`/api/students?${q}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch students');
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch soft-deleted students (Admin only)
  const fetchDeletedStudents = async () => {
    if (!isAdmin) return;
    try {
      const response = await fetch('/api/students?deleted=true', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (response.ok) setDeletedStudents(data);
    } catch (err) {
      console.error('Failed to fetch deleted students:', err);
    }
  };

  useEffect(() => {
    fetchStudents();
    if (isAdmin) fetchDeletedStudents();
  }, [dept, gender, hostel, status, phase, search, activeTab]);

  // Handle Soft Delete
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? (It can be restored later)`)) return;
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Deletion failed');
      alert(data.message);
      fetchStudents();
      fetchDeletedStudents();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Restore
  const handleRestore = async (id) => {
    try {
      const response = await fetch(`/api/students/${id}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Restore failed');
      alert(data.message);
      fetchStudents();
      fetchDeletedStudents();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Permanent Delete
  const handlePermanentDelete = async (id, name) => {
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete ${name}? This action CANNOT be undone.`)) return;
    try {
      const response = await fetch(`/api/students/${id}/permanent`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Permanent deletion failed');
      alert(data.message);
      fetchDeletedStudents();
    } catch (err) {
      alert(err.message);
    }
  };

  // Excel Import Submit
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Please select an Excel sheet');
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportResult(null);

    const formData = new FormData();
    formData.append('excelFile', importFile);

    try {
      const response = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Excel import failed');
      setImportResult(data);
      setImportFile(null);
      fetchStudents();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Excel Export Trigger
  const handleExport = () => {
    const q = new URLSearchParams({ dept, status, phase, search }).toString();
    window.open(`/api/students/export/excel?${q}&token=${localStorage.getItem('token')}`);
  };

  // Add Student Submit
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newStudent)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add student');
      alert(data.message);
      setShowAddForm(false);
      fetchStudents();
    } catch (err) {
      alert(err.message);
    }
  };

  // Unique departments for filter list
  const deptsList = [
    'BSc Computer Science',
    'BSc IT',
    'MCA',
    'BE CSE',
    'MBA'
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'var(--font-title)' }}>Students Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Manage the student placement database, profile records, and resume scoring.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExport} className="btn btn-secondary">
            <Download size={16} />
            <span>Export Excel</span>
          </button>

          {isAdmin && (
            <>
              <button onClick={() => setShowImport(true)} className="btn btn-secondary">
                <Upload size={16} />
                <span>Import Excel</span>
              </button>
              
              <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
                <Plus size={16} />
                <span>Add Student</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Admin Tabs */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1px' }}>
          <button
            onClick={() => setActiveTab('active')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'active' ? '3px solid var(--brand-blue)' : '3px solid transparent',
              color: activeTab === 'active' ? 'var(--brand-blue)' : 'var(--text-secondary)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Active Student Directory
          </button>
          <button
            onClick={() => setActiveTab('deleted')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'deleted' ? '3px solid var(--brand-orange)' : '3px solid transparent',
              color: activeTab === 'deleted' ? 'var(--brand-orange)' : 'var(--text-secondary)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Trash / Deleted Students ({deletedStudents.length})
          </button>
        </div>
      )}

      {activeTab === 'active' ? (
        <>
          {/* 1. Search & Advanced Filters */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search by Name, Roll No, Dept..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <select className="form-select" style={{ width: '180px' }} value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">All Departments</option>
              {deptsList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select className="form-select" style={{ width: '130px' }} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <select className="form-select" style={{ width: '140px' }} value={hostel} onChange={(e) => setHostel(e.target.value)}>
              <option value="">Hosteller/Day Scholar</option>
              <option value="Hosteller">Hosteller</option>
              <option value="Day Scholar">Day Scholar</option>
            </select>

            <select className="form-select" style={{ width: '150px' }} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Placement Status</option>
              <option value="Placed">Placed</option>
              <option value="Yet To Be Placed">Yet To Be Placed</option>
            </select>

            <select className="form-select" style={{ width: '150px' }} value={phase} onChange={(e) => setPhase(e.target.value)}>
              <option value="">Recruitment Phase</option>
              <option value="Registration">Registration</option>
              <option value="Applied">Applied</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Assessment">Assessment</option>
              <option value="Technical Round">Technical Round</option>
              <option value="HR Round">HR Round</option>
              <option value="Final Round">Final Round</option>
              <option value="Selected">Selected</option>
              <option value="Rejected">Rejected</option>
              <option value="Joined">Joined</option>
            </select>
          </div>

          {/* 2. Main Active Student Database Table */}
          <div className="glass-panel" style={{ padding: '8px' }}>
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>UG %</th>
                    <th>Email</th>
                    <th>ATS Score</th>
                    <th>Placement Status</th>
                    <th>Phase</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>Loading list...</td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No students match the criteria.
                      </td>
                    </tr>
                  ) : (
                    students.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{s.roll_number}</td>
                        <td style={{ color: '#fff', fontWeight: '600' }}>{s.name}</td>
                        <td>{s.department}</td>
                        <td>{s.ug_percent}%</td>
                        <td>{s.email_id}</td>
                        <td style={{ fontWeight: 'bold' }}>
                          <span style={{
                            color: s.ats_score >= 80 ? 'var(--brand-green)' : s.ats_score >= 60 ? 'var(--brand-orange)' : 'var(--text-muted)'
                          }}>
                            {s.ats_score || 0}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${s.placement_status === 'Placed' ? 'placed' : 'unplaced'}`}>
                            {s.placement_status}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-phase">
                            {s.current_phase}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => navigate(`/students/${s.id}`)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                              title="View detailed profile"
                            >
                              <Eye size={14} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(s.id, s.name)}
                                className="btn btn-danger"
                                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                title="Move to trash"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Deleted Student Recycle Bin */
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--brand-orange)', marginBottom: '14px' }}>
            Soft Deleted Records (Recycle Bin)
          </h3>
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>Deleted At</th>
                  <th>Deleted By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deletedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Recycle Bin is empty.
                    </td>
                  </tr>
                ) : (
                  deletedStudents.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace' }}>{s.roll_number}</td>
                      <td style={{ color: '#fff', fontWeight: '600' }}>{s.name}</td>
                      <td>{s.department}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {new Date(s.deleted_at).toLocaleString()}
                      </td>
                      <td style={{ color: 'var(--brand-orange)', fontWeight: '600', fontSize: '0.8rem' }}>
                        {s.deleted_by}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleRestore(s.id)}
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--brand-green)', boxShadow: 'none' }}
                          >
                            <RotateCcw size={14} />
                            <span>Restore</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(s.id, s.name)}
                            className="btn btn-danger"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            <Trash2 size={14} />
                            <span>Delete Perm</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Excel Import Dialog */}
      {showImport && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(5,7,18,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '28px', background: 'rgba(20,26,46,0.95)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Import Student Database from Excel</h3>
              <button onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
            </div>

            {importError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertCircle size={16} />
                <span>{importError}</span>
              </div>
            )}

            {!importResult ? (
              <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ border: '2px dashed var(--border-glass)', borderRadius: '8px', padding: '30px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                  <input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files[0])} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                  <Upload size={32} style={{ marginBottom: '8px', color: 'var(--text-secondary)' }} />
                  <p style={{ fontWeight: '600' }}>{importFile ? importFile.name : 'Select student roster Excel sheet'}</p>
                </div>
                <button type="submit" className="btn btn-primary" disabled={importLoading} style={{ width: '100%' }}>
                  {importLoading ? 'Reading & Validating Roster...' : 'Validate and Preview'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Rows</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{importResult.totalRows}</div>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>Valid Rows</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{importResult.validRows}</div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>Invalid Rows</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-error)' }}>{importResult.invalidRows}</div>
                  </div>
                  <div style={{ background: 'rgba(27,155,227,0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(27,155,227,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)' }}>Imported</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--brand-blue)' }}>{importResult.importedRows}</div>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <label className="form-label" style={{ color: 'var(--color-error)' }}>Validation Diagnostics Report</label>
                    <div style={{
                      maxHeight: '150px', overflowY: 'auto', background: 'rgba(239,68,68,0.03)',
                      border: '1px solid rgba(239,68,68,0.2)', padding: '10px', borderRadius: '6px',
                      fontSize: '0.8rem', color: '#fca5a5', fontFamily: 'monospace'
                    }}>
                      {importResult.errors.map((err, i) => <div key={i} style={{ marginBottom: '4px' }}>&bull; {err}</div>)}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => { setShowImport(false); setImportResult(null); }} className="btn btn-secondary">
                    Close Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Add Student Form Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(5,7,18,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyCenter: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '680px', padding: '28px', background: 'rgba(20,26,46,0.95)', overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Add New Student Profile</h3>
              <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
            </div>

            <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input required type="text" className="form-input" value={newStudent.roll_number} onChange={(e) => setNewStudent({...newStudent, roll_number: e.target.value})} placeholder="e.g. 23BCS120" />
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input required type="text" className="form-input" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} placeholder="e.g. Anand R" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={newStudent.department} onChange={(e) => setNewStudent({...newStudent, department: e.target.value})}>
                    {deptsList.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={newStudent.gender} onChange={(e) => setNewStudent({...newStudent, gender: e.target.value})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Email ID</label>
                  <input required type="email" className="form-input" value={newStudent.email_id} onChange={(e) => setNewStudent({...newStudent, email_id: e.target.value})} placeholder="anand.r@rathinam.in" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input type="text" className="form-input" value={newStudent.mobile_number} onChange={(e) => setNewStudent({...newStudent, mobile_number: e.target.value})} placeholder="+91 944..." />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">SSLC %</label>
                  <input type="number" step="0.1" className="form-input" value={newStudent.sslc_percent} onChange={(e) => setNewStudent({...newStudent, sslc_percent: e.target.value})} placeholder="90" />
                </div>
                <div className="form-group">
                  <label className="form-label">HSC %</label>
                  <input type="number" step="0.1" className="form-input" value={newStudent.hsc_percent} onChange={(e) => setNewStudent({...newStudent, hsc_percent: e.target.value})} placeholder="85" />
                </div>
                <div className="form-group">
                  <label className="form-label">UG %</label>
                  <input type="number" step="0.1" className="form-input" value={newStudent.ug_percent} onChange={(e) => setNewStudent({...newStudent, ug_percent: e.target.value})} placeholder="80" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Technical Skills (Comma Separated)</label>
                <input type="text" className="form-input" value={newStudent.skills} onChange={(e) => setNewStudent({...newStudent, skills: e.target.value})} placeholder="Java, Python, SQL, React" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
