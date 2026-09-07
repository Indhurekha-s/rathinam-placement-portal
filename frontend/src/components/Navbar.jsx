import React, { useState, useEffect } from 'react';
import { Bell, Search, User, Check, Trash } from 'lucide-react';

export default function Navbar({ title, user, globalSearch, setGlobalSearch, notifications = [], fetchNotifications }) {
  const [showNotif, setShowNotif] = useState(false);
  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markSingleRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      height: '70px',
      background: 'rgba(13, 17, 33, 0.75)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-glass)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 30px',
      position: 'fixed',
      top: 0,
      right: 0,
      left: '260px',
      zIndex: 99
    }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: '600', fontFamily: 'var(--font-title)' }}>
          {title}
        </h1>
      </div>

      {/* Right Tools: Global Search + Notifications + Quick Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        
        {/* Global Search Bar */}
        {setGlobalSearch && (
          <div style={{ position: 'relative', width: '280px' }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} 
            />
            <input 
              type="text" 
              placeholder="Search students, companies..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 38px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '20px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'var(--transition-smooth)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--brand-blue)';
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-glass)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            />
          </div>
        )}

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotif(!showNotif)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: unreadCount > 0 ? 'var(--brand-orange)' : 'var(--text-secondary)',
              transition: 'var(--transition-smooth)',
              border: '1px solid var(--border-glass)'
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--brand-orange)',
                color: '#fff',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.7rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #0d0e15'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotif && (
            <div style={{
              position: 'absolute',
              top: '50px',
              right: 0,
              width: '360px',
              maxHeight: '450px',
              background: 'rgba(20, 24, 45, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-blue)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Content List */}
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No alerts in notification center.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id}
                      style={{
                        padding: '12px 20px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background: n.is_read === 0 ? 'rgba(27, 155, 227, 0.04)' : 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: n.is_read === 0 ? '600' : '400',
                          color: n.is_read === 0 ? '#fff' : 'var(--text-secondary)'
                        }}>
                          {n.title}
                        </span>
                        {n.is_read === 0 && (
                          <button
                            onClick={() => markSingleRead(n.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--brand-green)',
                              cursor: 'pointer',
                              padding: '2px'
                            }}
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile role badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderLeft: '1px solid var(--border-glass)',
          paddingLeft: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: 'var(--brand-green)',
            border: '1px solid rgba(146, 200, 62, 0.2)'
          }}>
            {user?.role}
          </div>
        </div>

      </div>
    </div>
  );
}
