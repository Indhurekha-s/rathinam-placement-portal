import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, Building2, 
  CheckSquare, FileText, Cpu, FileBarChart2, 
  Bell, Settings, LogOut
} from 'lucide-react';

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || 'Student';

  // Define 10 sidebar navigation items dynamically filtered by user roles
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Manager', 'Placement Team Member', 'Recruiter', 'Student'] },
    { name: 'Students', path: '/students', icon: Users, roles: ['Admin', 'Manager', 'Placement Team Member', 'Recruiter'] },
    { name: 'Placement Details', path: '/placement', icon: Briefcase, roles: ['Admin', 'Manager', 'Placement Team Member', 'Student'] },
    { name: 'Companies', path: '/companies', icon: Building2, roles: ['Admin', 'Manager', 'Placement Team Member', 'Recruiter'] },
    { name: 'Recruiters', path: '/recruiters', icon: CheckSquare, roles: ['Admin', 'Manager', 'Placement Team Member'] },
    { name: 'Job Descriptions', path: '/jd-ats', icon: FileText, roles: ['Admin', 'Placement Team Member'] },
    { name: 'ATS & AI Matching', path: '/jd-ats-matching', icon: Cpu, roles: ['Admin', 'Placement Team Member'] },
    { name: 'Reports', path: '/reports', icon: FileBarChart2, roles: ['Admin', 'Manager', 'Placement Team Member'] },
    { name: 'Notifications', path: '/notifications-panel', icon: Bell, roles: ['Admin', 'Manager', 'Placement Team Member', 'Recruiter', 'Student'] },
    { name: 'Settings', path: '/settings-panel', icon: Settings, roles: ['Admin', 'Manager', 'Placement Team Member', 'Recruiter', 'Student'] }
  ];

  // Filter items matching current user role
  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div style={{
      width: '260px',
      height: '100vh',
      background: '#FFFFFF', // White Sidebar Card background
      borderRight: '1px solid rgba(109, 31, 59, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      fontFamily: 'var(--font-title)'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(109, 31, 59, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <img 
          src="/assets/logo.jpg" 
          alt="Rathinam Logo" 
          onError={(e) => { e.target.src = 'https://rathinamcolleges.edu.in/wp-content/uploads/2020/09/Logo.png'; }}
          style={{ width: '40px', height: '40px', objectFit: 'contain' }} 
        />
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#6D1F3B', letterSpacing: '0.5px' }}>RATHINAM</h2>
          <span style={{ fontSize: '0.65rem', color: '#C9A227', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Placement Portal</span>
        </div>
      </div>

      {/* Navigation List */}
      <div style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        {filteredItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                background: isActive ? 'rgba(109, 31, 59, 0.06)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: isActive ? '#6D1F3B' : '#475569',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.85rem',
                fontWeight: isActive ? '700' : '500',
                transition: 'var(--transition-smooth)',
                borderLeft: isActive ? '3px solid #C9A227' : '3px solid transparent' // Gold active highlight
              }}
              onMouseEnter={(e) => {
                if(!isActive) {
                  e.currentTarget.style.color = '#6D1F3B';
                  e.currentTarget.style.background = 'rgba(109, 31, 59, 0.02)';
                }
              }}
              onMouseLeave={(e) => {
                if(!isActive) {
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={16} color={isActive ? '#6D1F3B' : '#64748b'} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(109, 31, 59, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(109, 31, 59, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6D1F3B',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            border: '1px solid rgba(109, 31, 59, 0.15)'
          }}>
            {user?.name ? user.name[0] : 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: '#252525', fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.name || 'User'}</div>
            <div style={{ color: '#C9A227', fontSize: '0.7rem', fontWeight: '700', textTransform: 'capitalize' }}>{user?.role?.replace(/_/g, ' ')}</div>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px',
            background: 'rgba(185, 28, 28, 0.06)',
            border: '1px solid rgba(185, 28, 28, 0.12)',
            borderRadius: '6px',
            color: '#b91c1c',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.8rem',
            transition: 'var(--transition-smooth)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(185, 28, 28, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(185, 28, 28, 0.06)';
          }}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
