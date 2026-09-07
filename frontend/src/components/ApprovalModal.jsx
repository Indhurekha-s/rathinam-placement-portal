import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

export default function ApprovalModal({ isOpen, onClose, student, companies = [], onActionCompleted }) {
  if (!isOpen || !student) return null;

  const [ctc, setCtc] = useState(student.ctc || 4.5);
  const [companyId, setCompanyId] = useState(student.company_id || (companies[0]?.id || ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    if (!companyId) {
      setError('Please select a company');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/approval/${student.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ companyId: parseInt(companyId), ctc: parseFloat(ctc) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Approval failed');
      onActionCompleted();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm(`Are you sure you want to reject this placement selection for ${student.name}?`)) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/approval/${student.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Rejection failed');
      onActionCompleted();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(5, 7, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div 
        className="glass-panel fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(20, 26, 46, 0.95)',
          padding: '28px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={22} color="var(--brand-orange)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Placement Selection Approval</h2>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Student Details Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-glass)',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '0.9rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Student Name:</span>
            <span style={{ fontWeight: '600' }}>{student.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Roll Number:</span>
            <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{student.roll_number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Department:</span>
            <span>{student.department}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>ATS Compatibility Score:</span>
            <span style={{ fontWeight: '700', color: student.ats_score >= 80 ? 'var(--brand-green)' : 'var(--brand-orange)' }}>
              {student.ats_score}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Resume Profile:</span>
            <a 
              href={`${student.resume_link}`} 
              target="_blank" 
              rel="noreferrer"
              style={{ color: 'var(--brand-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              <FileText size={14} />
              <span>View Resume</span>
            </a>
          </div>
        </div>

        {/* Input Parameters Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Select Placed Company</label>
            <select 
              className="form-select"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">-- Choose Company --</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.location})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Final Offered CTC (LPA)</label>
            <input 
              type="number" 
              step="0.05"
              className="form-input" 
              value={ctc} 
              onChange={(e) => setCtc(e.target.value)}
              placeholder="e.g. 6.5"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleReject}
            disabled={loading}
            style={{ flex: 1, border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171' }}
          >
            Reject Offer
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={handleApprove}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? 'Processing...' : 'Approve & Place'}
          </button>
        </div>
      </div>
    </div>
  );
}
