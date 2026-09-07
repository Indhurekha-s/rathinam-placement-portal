import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Building, Calendar, Award, RefreshCw, Plus, 
  FileSpreadsheet, ClipboardList, FileText, BarChart3, 
  AlertCircle, ChevronRight, Activity, Clock
} from 'lucide-react';
import ChartComponent from '../components/ChartComponent';

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';
  const isMember = user?.role === 'Placement Team Member';

  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Summary Stats
      const resStats = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const dataStats = await resStats.json();
      if (!resStats.ok) throw new Error(dataStats.error || 'Failed to fetch dashboard stats');
      setStats(dataStats);

      // 2. Fetch Recent Activities (Audit Logs)
      if (isAdmin || isManager) {
        const resLogs = await fetch('/api/audit-logs', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (resLogs.ok) {
          const dataLogs = await resLogs.json();
          setActivities(dataLogs.slice(0, 5)); // Get latest 5 activities
        }
      } else {
        // Mock some general activity logs for student/recruiter views
        setActivities([
          { action: 'JD uploaded', record_type: 'Company', user_name: 'Member 1', created_at: new Date() },
          { action: 'Company status changed', record_type: 'Company', user_name: 'Member 2', created_at: new Date() }
        ]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '60px 40px', textAlign: 'center', color: '#6D1F3B' }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
        <span style={{ fontWeight: '600' }}>Loading placement management statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', color: 'var(--color-error)' }}>
        <h3>Error loading Placement Dashboard</h3>
        <p>{error}</p>
      </div>
    );
  }

  const { summary = {}, statusCounts = [], phaseCounts = [], deptCounts = [], recentDrives = [], ctcBuckets = {}, placementRatio = {} } = stats || {};

  // Overall placement percentage calculation
  const totalStud = summary.totalStudents || 1;
  const placedStud = summary.placedStudents || 0;
  const placementPercentage = Math.round((placedStud / totalStud) * 100);

  // Placed vs Unplaced Ratio
  const placedRatioData = [
    { label: 'Placed', value: placedStud },
    { label: 'Yet To Place', value: summary.yetToPlace || 0 }
  ];

  // Company Status totals
  const coldCount = statusCounts.find(s => s.status === 'COLD')?.count || 0;
  const warmCount = statusCounts.find(s => s.status === 'WARM')?.count || 0;
  const hotCount = statusCounts.find(s => s.status === 'HOT')?.count || 0;
  const completedCount = statusCounts.find(s => s.status === 'DRIVE COMPLETED')?.count || 0;

  // Stages Progress Counts mapping
  const getStageCount = (stageName) => {
    return phaseCounts.find(p => p.phase.toLowerCase() === stageName.toLowerCase())?.count || 0;
  };
  const stagesData = [
    { label: 'Registered', value: getStageCount('Registration') },
    { label: 'Applied', value: getStageCount('Applied') },
    { label: 'Shortlisted', value: getStageCount('Shortlisted') },
    { label: 'Tech Round', value: getStageCount('Technical Round') },
    { label: 'HR Round', value: getStageCount('HR Round') },
    { label: 'Final Round', value: getStageCount('Final Round') },
    { label: 'Selected', value: getStageCount('Selected') },
    { label: 'Rejected', value: getStageCount('Rejected') }
  ];

  // Department counts mapping
  const deptData = deptCounts.map(d => ({
    label: d.department.split(' ').map(w => w[0]).join(''), // short abbreviation
    value: d.count
  }));

  // Separate recent vs upcoming drives (date check or status based)
  const upcomingDrives = recentDrives.filter(d => d.status === 'WARM' || d.status === 'HOT');
  const pastDrives = recentDrives.filter(d => d.status === 'DRIVE COMPLETED');

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: '#252525' }}>
      
      {/* Dashboard Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(109, 31, 59, 0.08)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#4A1428', fontFamily: 'var(--font-title)' }}>
            Rathinam Placement Portal
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.85rem', color: '#6B7280' }}>
            <span>Welcome back, {user?.name || 'Admin'}</span>
            <span>&bull;</span>
            <span style={{ color: '#C9A227', fontWeight: '600' }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <button 
          onClick={fetchDashboardData}
          className="btn btn-secondary"
          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
        >
          <RefreshCw size={14} />
          <span>Refresh stats</span>
        </button>
      </div>

      {/* 1. TOP SUMMARY CARDS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        {/* Total Students Card */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #6D1F3B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Students</span>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#4A1428', marginTop: '4px', fontFamily: 'var(--font-title)' }}>{summary.totalStudents}</div>
            </div>
            <div style={{ background: 'rgba(109, 31, 59, 0.06)', color: '#6D1F3B', padding: '10px', borderRadius: '8px' }}>
              <Users size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '8px' }}>
            <span style={{ color: '#6B7280' }}>Eligible base (CGPA):</span>
            <span style={{ fontWeight: '700', color: '#6D1F3B' }}>{summary.eligibleStudents} students</span>
          </div>
        </div>

        {/* Placed Ratios Card */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #15803d' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Placed Students</span>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#15803d', marginTop: '4px', fontFamily: 'var(--font-title)' }}>{summary.placedStudents}</div>
            </div>
            <div style={{ background: 'rgba(21, 128, 61, 0.06)', color: '#15803d', padding: '10px', borderRadius: '8px' }}>
              <Award size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '8px' }}>
            <span style={{ color: '#6B7280' }}>Yet to place:</span>
            <span style={{ fontWeight: '700', color: '#b91c1c' }}>{summary.yetToPlace} candidates</span>
          </div>
        </div>

        {/* Companies Tally Card */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #C9A227' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Companies</span>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b08d20', marginTop: '4px', fontFamily: 'var(--font-title)' }}>{summary.totalCompanies}</div>
            </div>
            <div style={{ background: 'rgba(201, 162, 39, 0.06)', color: '#C9A227', padding: '10px', borderRadius: '8px' }}>
              <Building size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '8px' }}>
            <span style={{ color: '#6B7280' }}>Active Drives (Hot/Warm):</span>
            <span style={{ fontWeight: '700', color: '#6D1F3B' }}>{summary.activeCompanies} accounts</span>
          </div>
        </div>

        {/* Offers & Packages Card */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #0369a1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Offers Confirmed</span>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0369a1', marginTop: '4px', fontFamily: 'var(--font-title)' }}>{summary.totalOffers}</div>
            </div>
            <div style={{ background: 'rgba(3, 105, 161, 0.06)', color: '#0369a1', padding: '10px', borderRadius: '8px' }}>
              <Award size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '8px' }}>
            <span style={{ color: '#6B7280' }}>Average Pack / Highest:</span>
            <span style={{ fontWeight: '700', color: '#6D1F3B' }}>{summary.averageCTC}L / {summary.highestCTC}L</span>
          </div>
        </div>
      </div>

      {/* 2. PLACEMENT OVERVIEW & OVERALL RATE SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
        
        {/* Placement Ratio donut */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#6D1F3B' }}>Placement Overview</h3>
          <ChartComponent type="donut" data={placedRatioData} />
          
          <div style={{
            background: 'rgba(109, 31, 59, 0.04)',
            border: '1px dashed rgba(109, 31, 59, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
            fontSize: '0.85rem'
          }}>
            Overall Placement Success Rate: <strong style={{ color: '#6D1F3B', fontSize: '1.15rem' }}>{placementPercentage}%</strong>
          </div>
        </div>

        {/* Department wise counts */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#6D1F3B', marginBottom: '14px' }}>Department-wise Student Count</h3>
          <ChartComponent type="bar" data={deptData} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.7rem', color: '#6B7280', marginTop: '10px', flexWrap: 'wrap' }}>
            <span>BCS: BSc CS</span>
            <span>BIT: BSc IT</span>
            <span>MCA: Comp Applications</span>
            <span>BCSE: BE CSE</span>
            <span>MBA: Management</span>
          </div>
        </div>
      </div>

      {/* 3. STAGES PROGRESS & COMPANY STATUSE STALLIES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
        
        {/* Student Stages progress */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#6D1F3B', marginBottom: '14px' }}>Student Recruitment Stages</h3>
          <ChartComponent type="bar" data={stagesData} />
        </div>

        {/* Company status accounts */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#6D1F3B' }}>Company Status Allocations</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyBetween: 'space-between', background: '#FDFBF8', border: '1px solid rgba(109, 31, 59, 0.06)', borderRadius: '8px', padding: '12px 16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-cold" style={{ fontSize: '0.65rem' }}>COLD</span>
                <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Hidden from Recruiters</span>
              </div>
              <strong style={{ fontSize: '1.15rem', color: '#252525' }}>{coldCount}</strong>
            </div>

            <div style={{ display: 'flex', justifyBetween: 'space-between', background: '#FDFBF8', border: '1px solid rgba(109, 31, 59, 0.06)', borderRadius: '8px', padding: '12px 16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-warm" style={{ fontSize: '0.65rem' }}>WARM</span>
                <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Pending Schedule</span>
              </div>
              <strong style={{ fontSize: '1.15rem', color: '#0369a1' }}>{warmCount}</strong>
            </div>

            <div style={{ display: 'flex', justifyBetween: 'space-between', background: '#FDFBF8', border: '1px solid rgba(109, 31, 59, 0.06)', borderRadius: '8px', padding: '12px 16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-hot" style={{ fontSize: '0.65rem' }}>HOT</span>
                <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Active Drives</span>
              </div>
              <strong style={{ fontSize: '1.15rem', color: '#b45309' }}>{hotCount}</strong>
            </div>

            <div style={{ display: 'flex', justifyBetween: 'space-between', background: '#FDFBF8', border: '1px solid rgba(109, 31, 59, 0.06)', borderRadius: '8px', padding: '12px 16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-completed" style={{ fontSize: '0.65rem' }}>COMPLETED</span>
                <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Drives Completed</span>
              </div>
              <strong style={{ fontSize: '1.15rem', color: '#15803d' }}>{completedCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACTIONS & ACTIVITY STREAM */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Quick actions panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#6D1F3B' }}>Quick Actions</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {(isAdmin || isMember) && (
              <>
                <button onClick={() => navigate('/students')} className="btn btn-secondary" style={{ padding: '14px', flexDirection: 'column', gap: '6px' }}>
                  <Plus size={20} />
                  <span>Add Student</span>
                </button>

                <button onClick={() => navigate('/students')} className="btn btn-secondary" style={{ padding: '14px', flexDirection: 'column', gap: '6px' }}>
                  <FileSpreadsheet size={20} />
                  <span>Import Excel</span>
                </button>

                <button onClick={() => navigate('/companies')} className="btn btn-secondary" style={{ padding: '14px', flexDirection: 'column', gap: '6px' }}>
                  <Plus size={20} />
                  <span>Add Company</span>
                </button>

                <button onClick={() => navigate('/placement')} className="btn btn-secondary" style={{ padding: '14px', flexDirection: 'column', gap: '6px' }}>
                  <ClipboardList size={20} />
                  <span>Create Drive</span>
                </button>

                <button onClick={() => navigate('/jd-ats')} className="btn btn-secondary" style={{ padding: '14px', flexDirection: 'column', gap: '6px' }}>
                  <FileText size={20} />
                  <span>Upload JD</span>
                </button>
              </>
            )}

            <button onClick={() => navigate('/reports')} className="btn btn-secondary" style={{ padding: '14px', flexDirection: 'column', gap: '6px', gridColumn: (isAdmin || isMember) ? 'span 1' : 'span 2' }}>
              <BarChart3 size={20} />
              <span>View Reports</span>
            </button>
          </div>
        </div>

        {/* Recent Activity stream */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#6D1F3B' }}>Recent Activity</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activities.map((act, idx) => (
              <div key={idx} style={{
                display: 'flex',
                gap: '12px',
                borderBottom: '1px solid rgba(0,0,0,0.03)',
                paddingBottom: '8px',
                alignItems: 'center'
              }}>
                <div style={{
                  background: 'rgba(201, 162, 39, 0.08)',
                  padding: '6px',
                  borderRadius: '6px',
                  color: '#C9A227'
                }}>
                  <Activity size={16} />
                </div>
                <div style={{ flex: 1, fontSize: '0.8rem' }}>
                  <div style={{ color: '#252525', fontWeight: '700' }}>
                    {act.action} <span style={{ fontWeight: '500', color: '#6B7280' }}>({act.record_type || 'System'})</span>
                  </div>
                  <div style={{ color: '#6B7280', fontSize: '0.75rem', marginTop: '1px' }}>
                    Performed by: {act.user_name || 'System'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#9ca3af' }}>
                  <Clock size={12} />
                  <span>{act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. DRIVES SCHEDULES (UPCOMING AND COMPLETED SEPARATELY) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Upcoming recruitment drives */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#6D1F3B', marginBottom: '12px', borderBottom: '2px solid rgba(109, 31, 59, 0.06)', paddingBottom: '6px' }}>
            Upcoming Drives (Hot & Warm)
          </h3>
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Location</th>
                  <th>CTC</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {upcomingDrives.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '10px', color: '#6B7280' }}>No upcoming sessions.</td></tr>
                ) : (
                  upcomingDrives.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: '700', color: '#252525' }}>{d.name.split(' ')[0]}</td>
                      <td>{d.location}</td>
                      <td style={{ fontWeight: '700', color: '#15803d' }}>{d.ctc} LPA</td>
                      <td>{d.drive_date || 'TBD'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Past completed drives */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#6D1F3B', marginBottom: '12px', borderBottom: '2px solid rgba(109, 31, 59, 0.06)', paddingBottom: '6px' }}>
            Drive Results (Completed)
          </h3>
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Location</th>
                  <th>CTC</th>
                  <th>Offers</th>
                </tr>
              </thead>
              <tbody>
                {pastDrives.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '10px', color: '#6B7280' }}>No completed sessions.</td></tr>
                ) : (
                  pastDrives.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: '700', color: '#252525' }}>{d.name.split(' ')[0]}</td>
                      <td>{d.location}</td>
                      <td style={{ fontWeight: '700' }}>{d.ctc} LPA</td>
                      <td style={{ fontWeight: '700', color: '#15803d' }}>{d.selected_students} Selected</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
