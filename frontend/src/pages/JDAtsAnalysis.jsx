import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Check, X, Users, Upload, AlertCircle, 
  HelpCircle, RefreshCw, ChevronRight, CheckSquare 
} from 'lucide-react';
import JDUploader from '../components/JDUploader';

export default function JDAtsAnalysis({ user }) {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected Comparison target
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [comparison, setComparison] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Range filtering
  const [selectedRange, setSelectedRange] = useState(null); // '61-70', '71-80', '81-90', '91-100'

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch companies
      const resComp = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const dataComp = await resComp.json();
      if (resComp.ok) setCompanies(dataComp);

      // Fetch students
      const resStud = await fetch('/api/students', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const dataStud = await resStud.json();
      if (resStud.ok) setStudents(dataStud);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerComparison = async (studentId, companyId) => {
    if (!studentId || !companyId) return;
    setComparisonLoading(true);
    try {
      const response = await fetch(`/api/jd/compare?studentId=${studentId}&companyId=${companyId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Comparison failed');
      setComparison(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setComparisonLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId && selectedCompanyId) {
      triggerComparison(selectedStudentId, selectedCompanyId);
    }
  }, [selectedStudentId, selectedCompanyId]);

  // Calculate ATS Category Counts
  const getRangeCount = (min, max) => {
    return students.filter(s => s.ats_score >= min && s.ats_score <= max).length;
  };

  const ranges = [
    { label: '61–70', min: 61, max: 70, color: '#f59e0b' },
    { label: '71–80', min: 71, max: 80, color: 'var(--brand-purple)' },
    { label: '81–90', min: 81, max: 90, color: 'var(--brand-blue)' },
    { label: '91–100', min: 91, max: 100, color: 'var(--brand-green)' }
  ];

  const filteredStudentsByRange = selectedRange 
    ? students.filter(s => s.ats_score >= selectedRange.min && s.ats_score <= selectedRange.max)
    : [];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'var(--font-title)' }}>JD & AI ATS Resume Scanner</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Upload corporate Job Descriptions, automatically extract skill qualifiers, and score candidate resumes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Upload JD left panel */}
        <JDUploader 
          companies={companies.filter(c => c.status !== 'COLD')} 
          onUploadSuccess={() => {
            fetchData();
            if (selectedStudentId && selectedCompanyId) {
              triggerComparison(selectedStudentId, selectedCompanyId);
            }
          }}
        />

        {/* ATS score ranges right panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            Resume Compatibility Breakdown
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Click on any range below to view the eligible matching candidates list.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {ranges.map((r, i) => {
              const count = getRangeCount(r.min, r.max);
              const isSelected = selectedRange?.label === r.label;
              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedRange(isSelected ? null : r)}
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.01)',
                    border: '1px solid',
                    borderColor: isSelected ? r.color : 'var(--border-glass)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)',
                    boxShadow: isSelected ? `0 0 10px ${r.color}33` : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = r.color;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-glass)';
                  }}
                >
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: r.color, fontFamily: 'var(--font-title)' }}>
                    {r.label}%
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '4px' }}>
                    {count} Students
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filtered Range Students List */}
          {selectedRange && (
            <div style={{
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '14px',
              marginTop: '10px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: selectedRange.color }}>
                  Filtered: {selectedRange.label}% Score Range
                </span>
                <button 
                  onClick={() => setSelectedRange(null)} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Clear filter
                </button>
              </div>
              
              {filteredStudentsByRange.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No student in this range.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredStudentsByRange.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => navigate(`/students/${s.id}`)}
                      style={{
                        padding: '8px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'var(--transition-smooth)'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    >
                      <span style={{ color: '#fff', fontWeight: '600' }}>{s.name} ({s.roll_number})</span>
                      <span style={{ fontWeight: '700', color: selectedRange.color }}>{s.ats_score}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Side-by-Side JD vs Resume Student Assessment Comparison */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
          Side-by-Side ATS Comparison Dashboard
        </h3>

        {/* selectors */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">1. Choose Company Drive (JD Reference)</label>
            <select 
              className="form-select"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              <option value="">-- Select Company Drive --</option>
              {companies.filter(c => c.jd_text).map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.location})</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label className="form-label">2. Choose Student Candidate</label>
            <select 
              className="form-select"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">-- Select Student Profile --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>
              ))}
            </select>
          </div>
        </div>

        {comparisonLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px' }} />
            <span>Scanning student resume against JD keywords...</span>
          </div>
        ) : comparison ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Left Side: JD requirements */}
            <div style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--brand-orange)', marginBottom: '14px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                Job Description (JD)
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Company:</span>
                  <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem' }}>{comparison.company.name}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Drive Date:</span>
                  <div style={{ fontWeight: '500' }}>{comparison.company.drive_date || 'TBD'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Offered CTC:</span>
                  <div style={{ fontWeight: '700', color: 'var(--brand-green)' }}>{comparison.company.ctc} LPA</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Raw JD Requirements Extract:</span>
                  <pre style={{
                    background: 'rgba(0,0,0,0.2)',
                    padding: '12px',
                    borderRadius: '6px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginTop: '6px',
                    border: '1px solid var(--border-glass)'
                  }}>
                    {comparison.company.jd_text}
                  </pre>
                </div>
              </div>
            </div>

            {/* Right Side: Student Profile & ATS matching results */}
            <div style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--brand-blue)' }}>
                  Student Resume Compatibility
                </h4>
                <span style={{
                  fontSize: '1.4rem', 
                  fontWeight: '800', 
                  color: comparison.comparison.score >= 80 ? 'var(--brand-green)' : 'var(--brand-orange)'
                }}>
                  {comparison.comparison.score}% Match
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Candidate Name:</span>
                  <div style={{ fontWeight: '600', color: '#fff' }}>{comparison.student.name} ({comparison.student.roll_number})</div>
                </div>
                
                {/* Visual Indicators check / cross */}
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Skills Audit:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    
                    {/* Matching skills */}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-green)', fontWeight: '600', marginBottom: '4px' }}>Matching Skills:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {JSON.parse(comparison.comparison.matching_skills || '[]').map((sk, idx) => (
                          <span key={idx} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--color-success)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Check size={10} />
                            <span style={{ textTransform: 'capitalize' }}>{sk}</span>
                          </span>
                        ))}
                        {JSON.parse(comparison.comparison.matching_skills || '[]').length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None</span>}
                      </div>
                    </div>

                    {/* Missing skills */}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-error)', fontWeight: '600', marginBottom: '4px' }}>Missing Skills:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {JSON.parse(comparison.comparison.missing_skills || '[]').map((sk, idx) => (
                          <span key={idx} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <X size={10} />
                            <span style={{ textTransform: 'capitalize' }}>{sk}</span>
                          </span>
                        ))}
                        {JSON.parse(comparison.comparison.missing_skills || '[]').length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None</span>}
                      </div>
                    </div>

                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Eligibility Rating:</span>
                    <div style={{ fontWeight: '700', color: comparison.comparison.eligibility === 'ELIGIBLE' ? 'var(--brand-green)' : 'var(--color-error)', fontSize: '0.9rem', marginTop: '2px' }}>
                      {comparison.comparison.eligibility}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>AI Recommendation:</span>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem', marginTop: '2px' }}>
                      {comparison.comparison.recommendation}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            border: '1px dashed var(--border-glass)',
            borderRadius: '8px'
          }}>
            Please choose both a Company Drive and Student Profile above to generate side-by-side comparative ATS diagnostics.
          </div>
        )}
      </div>

    </div>
  );
}
