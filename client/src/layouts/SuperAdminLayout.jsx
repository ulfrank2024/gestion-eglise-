import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo_eden.jpg';
import { MdDomain, MdLeaderboard, MdExpandMore, MdExpandLess, MdLogout } from 'react-icons/md';
import { api } from '../api/api';
import { supabase } from '../supabaseClient';

function SuperAdminLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSections, setOpenSections] = useState({
    platformManagement: true,
    reportsAndStats: false,
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
      // Même en cas d'erreur, on déconnecte l'utilisateur localement
      localStorage.removeItem('supabase.auth.token');
      navigate('/super-admin/login');
    }
  };

  const [hoveredItem, setHoveredItem] = useState(null);

  const getLinkStyle = ({ isActive, itemName, isParent = false }) => {
    const isHovered = hoveredItem === itemName;
    const baseStyle = {
      textDecoration: 'none',
      padding: '8px 10px',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      transition: 'background-color 0.2s, color 0.2s',
      color: '#d1d5db',
    };

    if (isParent) {
      return {
        ...baseStyle,
        backgroundColor: '#374151',
        fontWeight: 'bold',
        marginBottom: '5px',
        color: '#f3f4f6',
      };
    }

    if (isActive) {
      return {
        ...baseStyle,
        backgroundColor: '#3b82f6',
        color: '#fff',
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

  const iconStyle = { marginRight: '10px' };
  const toggleIconStyle = { marginLeft: 'auto', fontSize: '1.2em', color: '#f3f4f6' };

  if (loading) {
    return <div style={{ padding: '20px', color: '#f3f4f6', background: '#111827', minHeight: '100vh' }}>{t('loading')}...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: '#ef4444', background: '#111827', minHeight: '100vh' }}>{error}</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111827' }}>
      <nav style={{ width: '250px', background: '#1f2937', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid #374151' }}>
        <div>
          <img
            src={logo}
            alt="Logo"
            style={{ maxWidth: '150px', height: 'auto', display: 'block', borderRadius: '100px', objectFit: 'contain' }}
          />
          <h3 style={{ color: '#f3f4f6', marginTop: '15px', marginBottom: '15px' }}>{t('super_admin_menu')}</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {/* Section Gestion de la Plateforme */}
            <li style={{ marginBottom: '10px' }}>
              <div
                onClick={() => toggleSection('platformManagement')}
                style={{ ...getLinkStyle({ itemName: 'platformManagement', isParent: true }), cursor: 'pointer' }}
              >
                <MdDomain style={iconStyle} />
                {t('platform_management')}
                {openSections.platformManagement ? (
                  <MdExpandLess style={toggleIconStyle} />
                ) : (
                  <MdExpandMore style={toggleIconStyle} />
                )}
              </div>
              {openSections.platformManagement && (
                <ul style={{ listStyle: 'none', paddingLeft: '20px', marginTop: '5px' }}>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/super-admin/dashboard"
                      onMouseEnter={() => setHoveredItem('dashboard')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'dashboard' })}
                    >
                      {t('all_churches')}
                    </NavLink>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/super-admin/events"
                      onMouseEnter={() => setHoveredItem('superAdminEvents')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'superAdminEvents' })}
                    >
                      {t('events_management')}
                    </NavLink>
                  </li>
                  {/* Ajouter d'autres liens spécifiques au Super-Admin ici */}
                </ul>
              )}
            </li>

            {/* Section Rapports et Statistiques */}
            <li style={{ marginBottom: '10px' }}>
              <div
                onClick={() => toggleSection('reportsAndStats')}
                style={{ ...getLinkStyle({ itemName: 'reportsAndStats', isParent: true }), cursor: 'pointer' }}
              >
                <MdLeaderboard style={iconStyle} />
                {t('reports_and_stats')}
                {openSections.reportsAndStats ? (
                  <MdExpandLess style={toggleIconStyle} />
                ) : (
                  <MdExpandMore style={toggleIconStyle} />
                )}
              </div>
              {openSections.reportsAndStats && (
                <ul style={{ listStyle: 'none', paddingLeft: '20px', marginTop: '5px' }}>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/super-admin/statistics"
                      onMouseEnter={() => setHoveredItem('statistics')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'statistics' })}
                    >
                      {t('platform_statistics')}
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>
        
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #374151' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px 12px',
              cursor: 'pointer',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '15px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            <MdLogout style={{ marginRight: '8px', fontSize: '18px' }} />
            {t('logout') || 'Déconnexion'}
          </button>

          <p style={{ marginBottom: '10px', fontSize: '14px', color: '#d1d5db' }}>{t('language_switcher')}:</p>
          <button
            onClick={() => handleLanguageChange('fr')}
            style={{
              marginRight: '5px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontWeight: i18n.language === 'fr' ? 'bold' : 'normal',
              backgroundColor: i18n.language === 'fr' ? '#3b82f6' : '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
          >FR</button>
          <button
            onClick={() => handleLanguageChange('en')}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontWeight: i18n.language === 'en' ? 'bold' : 'normal',
              backgroundColor: i18n.language === 'en' ? '#3b82f6' : '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
          >EN</button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '20px', color: '#ffffff' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default SuperAdminLayout;
