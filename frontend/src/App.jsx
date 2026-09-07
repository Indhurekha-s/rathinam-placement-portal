import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Placement from './pages/Placement';
import Companies from './pages/Companies';
import Recruiters from './pages/Recruiters';
import Reports from './pages/Reports';
import JDAtsAnalysis from './pages/JDAtsAnalysis';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ApprovalModal from './components/ApprovalModal';

export default function App() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [globalSearch, setGlobalSearch] = useState('');
  
  // Approval Modal states
  const [approvalStudent, setApprovalStudent] = useState(null);
  const [approvalCompanies, setApprovalCompanies] = useState([]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Pull local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const fetchNotifications = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);

        // Scan notifications to see if there is an unapproved 'approval' type notification
        // For Admin users, show the quick approval trigger in the UI
        if (user?.role === 'Admin') {
          const approvalNotif = data.find(n => n.type === 'approval' && n.is_read === 0);
          if (approvalNotif) {
            // Find student details dynamically or load company selections
            // We'll let the user click approval from notifications list or students directory
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // Poll notifications
  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // 10s polling
      return () => clearInterval(interval);
    }
  }, [user]);

  // Load companies for the approval workflow modal
  useEffect(() => {
    if (user && (user.role === 'Admin' || user.role === 'Manager')) {
      const fetchCompanies = async () => {
        try {
          const res = await fetch('/api/companies', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            setApprovalCompanies(data);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchCompanies();
    }
  }, [user, approvalStudent]);

  // Global Check: If Student login, route them directly to their Student profile page
  const getInitialRoute = () => {
    if (user?.role === 'Student') {
      return <Navigate to={`/students/${user.studentId}`} replace />;
    }
    return <Dashboard user={user} />;
  };

  return (
    <Router>
      <Routes>
        {/* Public Login Route */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />} 
        />

        {/* Protected App Routes */}
        <Route
          path="/*"
          element={
            !user ? <Navigate to="/login" replace /> : (
              <div style={{ minHeight: '100vh', background: 'var(--bg-gradient)' }}>
                
                {/* Sidebar Navigation */}
                <Sidebar user={user} onLogout={handleLogout} />

                {/* Main Content Layout Wrapper */}
                <div style={{ marginLeft: '260px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Top Bar Header */}
                  <Navbar 
                    title="Rathinam Placement Portal" 
                    user={user} 
                    globalSearch={globalSearch}
                    setGlobalSearch={setGlobalSearch}
                    notifications={notifications}
                    fetchNotifications={fetchNotifications}
                  />

                  {/* Dynamic Page Viewer Container */}
                  <main style={{ flex: 1, padding: '100px 30px 40px 30px', overflowY: 'auto' }}>
                    
                    {/* Check if student has final round selection notification (Admin alert banner) */}
                    {user.role === 'Admin' && notifications.some(n => n.type === 'approval' && n.is_read === 0) && (
                      <div className="glass-panel" style={{
                        background: 'rgba(109, 31, 59, 0.05)',
                        border: '1px solid rgba(109, 31, 59, 0.2)',
                        borderRadius: '8px',
                        padding: '14px 20px',
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <h4 style={{ fontSize: '0.9rem', color: '#6D1F3B', fontWeight: '700' }}>Admin Placement Offer Verification Required</h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>A student has completed a placement round and awaits formal offer approval.</p>
                        </div>
                        <button 
                          onClick={async () => {
                            // Find student in final round
                            try {
                              const res = await fetch('/api/students', {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                              });
                              const list = await res.json();
                              const finalRoundStud = list.find(s => s.current_phase === 'Final Round');
                              if (finalRoundStud) {
                                setApprovalStudent(finalRoundStud);
                              } else {
                                alert("No student currently flagged in 'Final Round' status.");
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="btn btn-primary" 
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                        >
                          Review Offer
                        </button>
                      </div>
                    )}

                    <Routes>
                      <Route path="/dashboard" element={getInitialRoute()} />
                      <Route path="/students" element={<Students user={user} />} />
                      <Route path="/students/:id" element={<StudentDetail user={user} />} />
                      <Route path="/placement" element={<Placement user={user} />} />
                      <Route path="/companies" element={<Companies user={user} />} />
                      <Route path="/recruiters" element={<Recruiters user={user} />} />
                      <Route path="/reports" element={<Reports user={user} />} />
                      <Route path="/jd-ats" element={<JDAtsAnalysis user={user} />} />
                      <Route path="/jd-ats-matching" element={<JDAtsAnalysis user={user} />} />
                      <Route path="/notifications-panel" element={<div className="glass-panel" style={{ padding: '30px', color: '#252525' }}><h3>Notifications Center</h3><p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Real-time updates, selection alerts, and drive approvals list.</p></div>} />
                      <Route path="/settings-panel" element={<div className="glass-panel" style={{ padding: '30px', color: '#252525' }}><h3>System Settings</h3><p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Placement drive config, password change, and email notification toggle.</p></div>} />
                      
                      {/* Fallback routing */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </main>

                </div>

                {/* Final Selection Approval Modal (Globally Managed) */}
                <ApprovalModal
                  isOpen={!!approvalStudent}
                  onClose={() => setApprovalStudent(null)}
                  student={approvalStudent}
                  companies={approvalCompanies}
                  onActionCompleted={() => {
                    fetchNotifications();
                    // Reload current path if reload function exists
                    window.location.reload();
                  }}
                />

              </div>
            )
          }
        />
      </Routes>
    </Router>
  );
}
