import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Linkedin, Globe, 
  Video, Mail, Phone, BookOpen, Briefcase, Award 
} from 'lucide-react';

export default function StudentDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudent = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/students/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch student details');
        setStudent(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading profile...</div>;
  if (error) return <div style={{ padding: '40px', color: 'var(--color-error)' }}>{error}</div>;
  if (!student) return <div style={{ padding: '40px' }}>Student not found.</div>;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Back navigation */}
      <div>
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-secondary"
          style={{ padding: '8px 12px', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Profile Overview Card (Glassmorphic Layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Side: Avatar & Core info */}
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--brand-blue)',
            boxShadow: 'var(--shadow-glow-blue)',
            background: 'var(--bg-gradient)'
          }}>
            <img 
              src={`${student.photo_link}`} 
              alt={student.name}
              onError={(e) => { e.target.src = '/logo.png'; }}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>{student.name}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{student.roll_number}</span>
            <div style={{ marginTop: '6px' }}>
              <span className="badge badge-phase">{student.department}</span>
            </div>
          </div>

          {/* Social Links */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            {student.github_id && (
              <a href={`https://github.com/${student.github_id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }} title="GitHub Profile">
                {student.github_id}
              </a>
            )}
            {student.linkedin_id && (
              <a href={`https://linkedin.com/in/${student.linkedin_id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-blue)' }} title="LinkedIn Profile">
                LinkedIn
              </a>
            )}
            {student.portfolio_link && (
              <a href={student.portfolio_link} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-orange)' }} title="Portfolio Website">
                Portfolio
              </a>
            )}
          </div>

          {/* Contact Details */}
          <div style={{ 
            width: '100%', 
            borderTop: '1px solid var(--border-glass)', 
            paddingTop: '16px', 
            textAlign: 'left',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={16} color="var(--brand-blue)" />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{student.email_id}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={16} color="var(--brand-green)" />
              <span>{student.mobile_number || 'Not Provided'}</span>
            </div>
            <div style={{ display: 'flex', justifyBetween: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
              <span>Category:</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>{student.hostel_day_scholar}</span>
            </div>
            <div style={{ display: 'flex', justifyBetween: 'space-between' }}>
              <span>Graduation:</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>{student.year_of_graduation}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Academics, Skills, and Placement Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Placement Status Summary */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={18} color="var(--brand-orange)" />
              <span>Placement Status & Records</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status</div>
                <div style={{ marginTop: '6px' }}>
                  <span className={`badge badge-${student.placement_status === 'Placed' ? 'placed' : 'unplaced'}`}>
                    {student.placement_status}
                  </span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Phase</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--brand-purple)', marginTop: '4px' }}>
                  {student.current_phase}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Offered CTC / Company</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                  {student.placement_status === 'Placed' ? `${student.ctc} LPA (${student.company_name})` : 'N/A'}
                </div>
              </div>
            </div>

            {student.ats_score > 0 && (
              <div style={{
                marginTop: '16px',
                background: 'rgba(27, 155, 227, 0.05)',
                border: '1px solid rgba(27, 155, 227, 0.2)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>ATS Resume Compatibility Score</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Matching with latest company JD upload requirements</p>
                </div>
                <span style={{ fontSize: '1.8rem', fontWeight: '800', color: student.ats_score >= 80 ? 'var(--brand-green)' : 'var(--brand-orange)' }}>
                  {student.ats_score}%
                </span>
              </div>
            )}
          </div>

          {/* Academic Records */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="var(--brand-blue)" />
              <span>Academic Performance</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SSLC Score</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '4px' }}>{student.sslc_percent}%</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>HSC Score</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '4px' }}>{student.hsc_percent}%</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>UG Score (CGPA)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '4px' }}>{student.ug_percent}%</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PG Score</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '4px' }}>{student.pg_percent ? `${student.pg_percent}%` : 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Technical Skills and Attachments */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="var(--brand-purple)" />
              <span>Skills & Credentials</span>
            </h3>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {student.skills ? student.skills.split(',').map((skill, i) => (
                <span 
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-glass)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  {skill.trim()}
                </span>
              )) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No skills logged.</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '14px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
              <a 
                href={`${student.resume_link}`} 
                download
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  padding: '12px', 
                  background: 'rgba(27,155,227,0.1)', 
                  border: '1px solid rgba(27,155,227,0.3)',
                  borderRadius: '8px',
                  color: 'var(--brand-blue)',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  transition: 'var(--transition-smooth)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(27,155,227,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(27,155,227,0.1)'; }}
              >
                <FileText size={18} />
                <span>Download Resume</span>
              </a>

              {student.self_introduction_link && (
                <a 
                  href={student.self_introduction_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    padding: '12px', 
                    background: 'rgba(255,124,59,0.1)', 
                    border: '1px solid rgba(255,124,59,0.3)',
                    borderRadius: '8px',
                    color: 'var(--brand-orange)',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'var(--transition-smooth)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,124,59,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,124,59,0.1)'; }}
                >
                  <Video size={18} />
                  <span>Watch Intro Video</span>
                </a>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
