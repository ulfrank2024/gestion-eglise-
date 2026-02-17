import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo_eden.png';
import {
  MdDashboard, MdChurch, MdEvent, MdPeople, MdLeaderboard,
  MdExpandMore, MdExpandLess, MdLogout, MdSettings, MdHistory, MdExtension
} from 'react-icons/md';
import { api } from '../api/api';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

function SuperAdminLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSections, setOpenSections] = useState({
    events: true,
    members: true,
    reports: false,
  });

  // Vérifier que l'utilisateur est bien un super admin
  React.useEffect(() => {
    const verifyAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error('No active session.');
        }

        // Récupérer les informations de l'utilisateur via l'API
        const userInfo = await api.auth.me();

        if (userInfo.church_role !== 'super_admin' || userInfo.church_id !== null) {
          throw new Error('Not a super admin');
        }

      } catch (err) {
        console.error('Error verifying super admin:', err);
        navigate('/super-admin/login');
      } finally {
        setLoading(false);
      }
    };
    verifyAuth();
  }, [navigate]);

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      await supabase.auth.signOut();
      localStorage.removeItem('supabase.auth.token');
      navigate('/super-admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('supabase.auth.token');
      navigate('/super-admin/login');
    }
  };

  const [hoveredItem, setHoveredItem] = useState(null);

  const getLinkStyle = ({ isActive, itemName, isParent = false, color = null }) => {
    const isHovered = hoveredItem === itemName;
    const baseStyle = {
      textDecoration: 'none',
      padding: '10px 12px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      transition: 'all 0.2s ease',
      color: '#d1d5db',
      fontSize: '14px',
    };

    if (isParent) {
      return {
        ...baseStyle,
        backgroundColor: color ? `${color}20` : '#374151',
        fontWeight: '600',
        marginBottom: '4px',
        color: color || '#f3f4f6',
        borderLeft: color ? `3px solid ${color}` : 'none',
      };
    }

    if (isActive) {
      return {
        ...baseStyle,
        backgroundColor: '#3b82f6',
        color: '#fff',
        fontWeight: '500',
      };
    }
    if (isHovered) {
      return {
        ...baseStyle,
        backgroundColor: '#374151',
        color: '#fff',
      };
    }
    return {
      ...baseStyle,
      backgroundColor: 'transparent',
    };
  };

  const iconStyle = { marginRight: '10px', fontSize: '18px' };
  const toggleIconStyle = { marginLeft: 'auto', fontSize: '1.2em', color: '#9ca3af' };

  if (loading) {
    return <div style={{ background: '#111827', minHeight: '100vh' }}><LoadingSpinner /></div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: '#ef4444', background: '#111827', minHeight: '100vh' }}>{error}</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111827' }}>
      <nav style={{
        width: '260px',
        background: '#1f2937',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid #374151',
        overflowY: 'auto',
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0
      }}>
        <div>
          {/* Logo et Titre */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img
              src={logo}
              alt="Logo"
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'contain', margin: '0 auto', border: '2px solid #374151' }}
            />
            <p style={{ color: '#f3f4f6', fontWeight: 'bold', fontSize: '16px', marginTop: '12px' }}>MY EDEN X</p>
            <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>{t('super_admin_panel') || 'Panneau Super Admin'}</p>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {/* Tableau de Bord Principal */}
            <li style={{ marginBottom: '8px' }}>
              <NavLink
                to="/super-admin/dashboard"
                onMouseEnter={() => setHoveredItem('dashboard')}
                onMouseLeave={() => setHoveredItem(null)}
                style={({ isActive }) => getLinkStyle({ isActive, itemName: 'dashboard' })}
              >
                <MdDashboard style={iconStyle} />
                {t('dashboard') || 'Tableau de Bord'}
              </NavLink>
            </li>

            {/* Gestion des Églises */}
            <li style={{ marginBottom: '8px' }}>
              <NavLink
                to="/super-admin/churches"
                onMouseEnter={() => setHoveredItem('churches')}
                onMouseLeave={() => setHoveredItem(null)}
                style={({ isActive }) => getLinkStyle({ isActive, itemName: 'churches' })}
                end
              >
                <MdChurch style={iconStyle} />
                {t('churches') || 'Églises'}
              </NavLink>
            </li>

            {/* Gestion des Modules */}
            <li style={{ marginBottom: '8px' }}>
              <NavLink
                to="/super-admin/modules"
                onMouseEnter={() => setHoveredItem('modules')}
                onMouseLeave={() => setHoveredItem(null)}
                style={({ isActive }) => getLinkStyle({ isActive, itemName: 'modules' })}
              >
                <MdExtension style={iconStyle} />
                {t('modules_management') || 'Gestion des Modules'}
              </NavLink>
            </li>

            {/* Séparateur */}
            <li style={{ borderTop: '1px solid #374151', margin: '16px 0' }}></li>

            {/* Module Événements */}
            <li style={{ marginBottom: '8px' }}>
              <div
                onClick={() => toggleSection('events')}
                style={{ ...getLinkStyle({ itemName: 'events', isParent: true, color: '#8b5cf6' }), cursor: 'pointer' }}
              >
                <MdEvent style={iconStyle} />
                {t('events_module') || 'Événements'}
                {openSections.events ? (
                  <MdExpandLess style={toggleIconStyle} />
                ) : (
                  <MdExpandMore style={toggleIconStyle} />
                )}
              </div>
              {openSections.events && (
                <ul style={{ listStyle: 'none', paddingLeft: '12px', marginTop: '4px' }}>
                  <li style={{ marginBottom: '4px' }}>
                    <NavLink
                      to="/super-admin/events"
                      onMouseEnter={() => setHoveredItem('eventsList')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'eventsList' })}
                    >
                      {t('all_events') || 'Tous les événements'}
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>

            {/* Module Membres */}
            <li style={{ marginBottom: '8px' }}>
              <div
                onClick={() => toggleSection('members')}
                style={{ ...getLinkStyle({ itemName: 'members', isParent: true, color: '#10b981' }), cursor: 'pointer' }}
              >
                <MdPeople style={iconStyle} />
                {t('members_module') || 'Membres'}
                {openSections.members ? (
                  <MdExpandLess style={toggleIconStyle} />
                ) : (
                  <MdExpandMore style={toggleIconStyle} />
                )}
              </div>
              {openSections.members && (
                <ul style={{ listStyle: 'none', paddingLeft: '12px', marginTop: '4px' }}>
                  <li style={{ marginBottom: '4px' }}>
                    <NavLink
                      to="/super-admin/members"
                      onMouseEnter={() => setHoveredItem('membersList')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'membersList' })}
                    >
                      {t('all_members') || 'Tous les membres'}
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>

            {/* Séparateur */}
            <li style={{ borderTop: '1px solid #374151', margin: '16px 0' }}></li>

            {/* Rapports et Statistiques */}
            <li style={{ marginBottom: '8px' }}>
              <div
                onClick={() => toggleSection('reports')}
                style={{ ...getLinkStyle({ itemName: 'reports', isParent: true, color: '#f59e0b' }), cursor: 'pointer' }}
              >
                <MdLeaderboard style={iconStyle} />
                {t('reports_and_stats') || 'Rapports'}
                {openSections.reports ? (
                  <MdExpandLess style={toggleIconStyle} />
                ) : (
                  <MdExpandMore style={toggleIconStyle} />
                )}
              </div>
              {openSections.reports && (
                <ul style={{ listStyle: 'none', paddingLeft: '12px', marginTop: '4px' }}>
                  <li style={{ marginBottom: '4px' }}>
                    <NavLink
                      to="/super-admin/statistics"
                      onMouseEnter={() => setHoveredItem('statistics')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'statistics' })}
                    >
                      {t('platform_statistics') || 'Statistiques'}
                    </NavLink>
                  </li>
                  <li style={{ marginBottom: '4px' }}>
                    <NavLink
                      to="/super-admin/activity"
                      onMouseEnter={() => setHoveredItem('activity')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'activity' })}
                    >
                      <MdHistory style={{ marginRight: '8px', fontSize: '16px' }} />
                      {t('activity_tracking') || 'Suivi d\'activité'}
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>

            {/* Note: Futurs modules à ajouter ici */}
            {/*
            <li style={{ marginBottom: '8px' }}>
              <div style={{ ...getLinkStyle({ itemName: 'finances', isParent: true, color: '#06b6d4' }), cursor: 'pointer', opacity: 0.5 }}>
                <MdAccountBalance style={iconStyle} />
                Comptabilité (Bientôt)
              </div>
            </li>
            */}
          </ul>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #374151' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px',
              cursor: 'pointer',
              backgroundColor: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
          >
            <MdLogout style={{ marginRight: '8px', fontSize: '18px' }} />
            {t('logout') || 'Déconnexion'}
          </button>

          <p style={{ marginBottom: '8px', fontSize: '13px', color: '#9ca3af' }}>{t('language_switcher')}:</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleLanguageChange('fr')}
              style={{
                flex: 1,
                padding: '8px',
                cursor: 'pointer',
                fontWeight: i18n.language === 'fr' ? 'bold' : 'normal',
                backgroundColor: i18n.language === 'fr' ? '#3b82f6' : '#374151',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                transition: 'background-color 0.2s',
                fontSize: '13px'
              }}
            >FR</button>
            <button
              onClick={() => handleLanguageChange('en')}
              style={{
                flex: 1,
                padding: '8px',
                cursor: 'pointer',
                fontWeight: i18n.language === 'en' ? 'bold' : 'normal',
                backgroundColor: i18n.language === 'en' ? '#3b82f6' : '#374151',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                transition: 'background-color 0.2s',
                fontSize: '13px'
              }}
            >EN</button>
          </div>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '24px', color: '#ffffff', overflowY: 'auto', height: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default SuperAdminLayout;
