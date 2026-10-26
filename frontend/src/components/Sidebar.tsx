import React from 'react';
import {
  DashboardIcon,
  DrivesIcon,
  AnalyticsIcon,
  CalendarIcon,
  UsersIcon,
  UserIcon,
  UploadIcon,
  BuildingIcon,
  ClassIcon,
  CheckCircleIcon
} from './Icons';

interface SidebarNavProps {
  role: 'Dean' | 'TPO' | 'Faculty' | 'Student';
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentView: 'dashboard' | 'profile';
  onViewChange: (view: 'dashboard' | 'profile') => void;
  userName?: string;
}

export const Sidebar: React.FC<SidebarNavProps> = ({
  role,
  currentTab,
  onTabChange,
  currentView,
  onViewChange,
  userName,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const getNavItems = () => {
    switch (role) {
      case 'TPO':
        return [
          { key: 'drives', label: 'Recruitment Drives', icon: DrivesIcon, badge: '18 Live' },
          { key: 'students', label: 'Students & Registry', icon: ClassIcon, badge: '42' },
          { key: 'analytics', label: 'Reports & Analytics', icon: AnalyticsIcon },
          { key: 'events', label: 'Recruitment Calendar', icon: CalendarIcon },
          { key: 'faculty', label: 'Faculty Coordinators', icon: BuildingIcon },
          { key: 'export', label: 'Data & Accreditation', icon: UploadIcon },
        ];
      case 'Dean':
        return [
          { key: 'overview', label: 'Executive Overview', icon: DashboardIcon },
          { key: 'drives', label: 'Drives Oversight', icon: DrivesIcon, badge: '18 Live' },
          { key: 'students', label: 'All Students', icon: UsersIcon },
          { key: 'staff', label: 'Faculty & TPO Staff', icon: BuildingIcon },
          { key: 'analytics', label: 'NIRF & CTC Reports', icon: AnalyticsIcon },
        ];
      case 'Faculty':
        return [
          { key: 'reviews', label: 'Pending Approvals', icon: DashboardIcon, badge: '42' },
          { key: 'students', label: 'Class Students', icon: UsersIcon },
        ];
      case 'Student':
        return [
          { key: 'profile', label: 'Academic Profile', icon: UserIcon },
          { key: 'verification', label: 'Verification', icon: CheckCircleIcon, badge: 'Required' },
          { key: 'drives', label: 'Eligible Drives', icon: DrivesIcon },
          { key: 'events', label: 'Campus Seminars', icon: CalendarIcon },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleSelectTab = (key: string) => {
    onViewChange('dashboard');
    onTabChange(key);
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: isHovered ? 250 : 76,
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isHovered ? '20px 14px' : '20px 10px',
        minHeight: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
        color: '#0F172A',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), padding 0.25s ease',
        overflow: 'hidden',
        boxShadow: isHovered ? '4px 0 20px rgba(0, 0, 0, 0.05)' : 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Brand Anchor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid #F1F5F9' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
              margin: isHovered ? '0' : '0 auto',
              transition: 'margin 0.25s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>school</span>
          </div>
          <div
            style={{
              opacity: isHovered ? 1 : 0,
              maxWidth: isHovered ? 170 : 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s ease, max-width 0.25s ease',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Placement<span style={{ color: '#2563EB' }}>Hub</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, marginTop: 2 }}>
              Enterprise Career Suite
            </div>
          </div>
        </div>

        {/* Season Selector Pill */}
        {isHovered && (
          <div
            style={{
              padding: '6px 10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#16A34A', flexShrink: 0 }}></span>
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Season 2024-25 • Phase 1</span>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94A3B8' }}>unfold_more</span>
          </div>
        )}

        {/* Navigation Section Label */}
        {isHovered && (
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#94A3B8',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              paddingLeft: 4,
            }}
          >
            Portal Navigation
          </div>
        )}

        {/* Nav List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => {
            const IconComp = item.icon;
            const isActive = currentView === 'dashboard' && currentTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectTab(item.key)}
                title={!isHovered ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isHovered ? 12 : 0,
                  justifyContent: isHovered ? 'space-between' : 'center',
                  padding: isHovered ? '9px 12px' : '10px 8px',
                  borderRadius: 8,
                  border: isActive ? '1px solid #DBEAFE' : '1px solid transparent',
                  background: isActive ? '#EFF6FF' : 'transparent',
                  color: isActive ? '#2563EB' : '#475569',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                    e.currentTarget.style.color = '#0F172A';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#475569';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconComp size={18} color={isActive ? '#2563EB' : '#64748B'} />
                  </div>
                  <span
                    style={{
                      opacity: isHovered ? 1 : 0,
                      maxWidth: isHovered ? 140 : 0,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.2s ease, max-width 0.2s ease',
                    }}
                  >
                    {item.label}
                  </span>
                </div>

                {isHovered && item.badge && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 12,
                      backgroundColor: isActive ? '#DBEAFE' : '#F1F5F9',
                      color: isActive ? '#1D4ED8' : '#64748B',
                      flexShrink: 0,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Segment: Live Sync & User Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
        {/* Live Sync Status */}
        {isHovered && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: '0.72rem', color: '#64748B' }}>
            <span style={{ position: 'relative', display: 'flex', width: 7, height: 7 }}>
              <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#22C55E', opacity: 0.75, animation: 'pulse 1.5s infinite' }}></span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#16A34A' }}></span>
            </span>
            <span>Cloud Sync Active</span>
          </div>
        )}

        {/* User Role Card */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: isHovered ? '8px 10px' : '8px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            justifyContent: isHovered ? 'flex-start' : 'center',
            transition: 'all 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.78rem',
              flexShrink: 0,
            }}
          >
            {userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : role[0]}
          </div>
          {isHovered && (
            <div style={{ minWidth: 0, flexGrow: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {userName || role}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {role} Account
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
