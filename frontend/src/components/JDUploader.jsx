import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function JDUploader({ companies = [], onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!companyId) {
      setError('Please select a company first');
      return;
    }
    if (!file) {
      setError('Please select a Job Description document');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    setParsedData(null);

    const formData = new FormData();
    formData.append('jdFile', file);
    formData.append('companyId', companyId);

    try {
      const response = await fetch('/api/jd/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.ok ? await response.json() : null;
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Upload and ATS analysis failed');
      }

      setMessage(data.message || 'JD uploaded and parsed successfully!');
      setParsedData(data);
      setFile(null);

      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
        Upload Job Description (JD)
      </h3>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#a7f3d0', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Associate with Company Drive</label>
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

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Select File (.pdf, .docx, .txt)</label>
          <div style={{
            border: '2px dashed var(--border-glass)',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.01)',
            position: 'relative'
          }}>
            <input 
              type="file" 
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            <Upload size={32} color="var(--text-secondary)" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>
              {file ? file.name : 'Click to select or drag document here'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Maximum file size: 10MB
            </p>
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Processing Document & Matching Resumes...' : 'Upload & Analyze ATS'}
        </button>
      </form>

      {/* Extracted content feedback */}
      {parsedData && (
        <div style={{
          marginTop: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-glass)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--brand-orange)', marginBottom: '10px' }}>
            Extracted Intelligence from JD
          </h4>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {parsedData.skills && parsedData.skills.length > 0 ? (
              parsedData.skills.map((skill, index) => (
                <span 
                  key={index}
                  style={{
                    background: 'rgba(27, 155, 227, 0.15)',
                    color: 'var(--brand-blue)',
                    border: '1px solid rgba(27, 155, 227, 0.3)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}
                >
                  {skill}
                </span>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No standard technical skills matched.</span>
            )}
          </div>

          <label className="form-label">Parsed Text Snippet</label>
          <pre style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--border-glass)',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            color: 'var(--text-secondary)',
            maxHeight: '150px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {parsedData.extractedText}
          </pre>
        </div>
      )}
    </div>
  );
}
