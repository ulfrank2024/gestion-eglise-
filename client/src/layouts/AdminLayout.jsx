import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import defaultLogo from '../assets/logo_eden.png';
import { MdEvent, MdLeaderboard, MdExpandMore, MdExpandLess, MdSettings, MdGroupAdd, MdHistory, MdLogout, MdDashboard, MdPeople } from 'react-icons/md';
import { api } from '../api/api';
import { supabase } from '../supabaseClient';

function AdminLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [churchId, setChurchId] = useState(null);
  const [churchDetails, setChurchDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [openSections, setOpenSections] = useState({
    churchManagement: true,
    reportsAndStats: false,
  });

  useEffect(() => {
    // Skip if already authenticated
    if (userRole && churchId) {
      console.log('=== AdminLayout: Already authenticated, skipping fetch ===', { userRole, churchId });
      setLoading(false);
      return;
    }

    // Éviter les appels multiples pendant le chargement
    let isCancelled = false;

    const fetchAuthInfoAndChurchDetails = async () => {
      console.log('=== AdminLayout: Starting authentication check ===');

      try {
        // Vérifier l'authentification via l'API backend (plus fiable que supabase.auth.getSession)
        // Le backend vérifie le token JWT et récupère church_id/role depuis la DB
        const userInfo = await api.auth.me();

        if (isCancelled) {
          console.log('=== AdminLayout: Request cancelled, ignoring response ===');
          return;
        }

        console.log('=== AdminLayout: api.auth.me() response ===', userInfo);

        const currentUserRole = userInfo.church_role;
        const currentChurchId = userInfo.church_id;

        if (!currentUserRole || !currentChurchId) {
          console.log('=== AdminLayout: Missing role or church_id, redirecting to login ===', { currentUserRole, currentChurchId });
          navigate('/admin/login');
          return;
        }

        console.log('=== AdminLayout: Authentication successful ===', { currentUserRole, currentChurchId });
        setUserRole(currentUserRole);
        setChurchId(currentChurchId);

        // Récupérer les détails de l'église (non bloquant)
        try {
          const details = await api.admin.getChurchDetails(currentChurchId);
          if (!isCancelled) {
            setChurchDetails(details);
          }
        } catch (detailsErr) {
          console.log('=== AdminLayout: Failed to fetch church details, using default ===', detailsErr);
          if (!isCancelled) {
            setChurchDetails({ name: 'Mon Église', logo_url: null });
          }
        }

      } catch (err) {
        if (isCancelled) {
          console.log('=== AdminLayout: Request cancelled, ignoring error ===');
          return;
        }

        console.error('=== AdminLayout: Authentication error ===', err);
        console.error('=== AdminLayout: Error details ===', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });

        if (err.response?.status === 401 || err.response?.status === 403) {
          // Token invalide ou expiré
          console.log('=== AdminLayout: 401/403 error, clearing token and redirecting ===');
          localStorage.removeItem('supabase.auth.token');
          navigate('/admin/login');
        } else {
          setError(err.message || 'Erreur d\'authentification');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchAuthInfoAndChurchDetails();

    // Cleanup function pour éviter les mises à jour d'état sur un composant démonté
    return () => {
      isCancelled = true;
    };
  }, [navigate, userRole, churchId]);

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
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('supabase.auth.token');
      navigate('/admin/login');
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
    return (
      <div style={{
        padding: '20px',
        color: '#f3f4f6',
        background: '#111827',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {t('loading')}...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        color: '#ef4444',
        background: '#111827',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {error}
      </div>
    );
  }

  if (userRole !== 'super_admin' && userRole !== 'church_admin') {
      return (
        <div style={{
          padding: '20px',
          color: '#ef4444',
          background: '#111827',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {t('forbidden_access')}
        </div>
      );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111827' }}>
      <nav style={{
        width: '260px',
        background: '#1f2937',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid #374151'
      }}>
        <div>
          {/* Logo et nom de l'église */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img
              src={churchDetails?.logo_url || defaultLogo}
              alt={churchDetails?.name || 'MY EDEN X'}
              style={{
                width: '80px',
                height: '80px',
                display: 'block',
                borderRadius: '50%',
                objectFit: 'cover',
                margin: '0 auto',
                border: '3px solid #4f46e5'
              }}
            />
            <h3 style={{
              color: '#f3f4f6',
              marginTop: '12px',
              marginBottom: '5px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              {churchDetails?.name || 'MY EDEN X'}
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>
              {t('church_management_platform')}
            </p>
          </div>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {/* Section Gestion de l'Église */}
            <li style={{ marginBottom: '10px' }}>
              <div
                onClick={() => toggleSection('churchManagement')}
                style={{ ...getLinkStyle({ itemName: 'churchManagement', isParent: true }), cursor: 'pointer' }}
              >
                <MdEvent style={iconStyle} />
                {t('church_management')}
                {openSections.churchManagement ? (
                  <MdExpandLess style={toggleIconStyle} />
                ) : (
                  <MdExpandMore style={toggleIconStyle} />
                )}
              </div>
              {openSections.churchManagement && (
                <ul style={{ listStyle: 'none', paddingLeft: '20px', marginTop: '5px' }}>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/admin/dashboard"
                      onMouseEnter={() => setHoveredItem('dashboard')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'dashboard' })}
                    >
                      <MdDashboard style={iconStyle} />
                      {t('dashboard')}
                    </NavLink>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/admin/events"
                      onMouseEnter={() => setHoveredItem('events')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'events' })}
                    >
                      <MdEvent style={iconStyle} />
                      {t('events')}
                    </NavLink>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/admin/all-attendees"
                      onMouseEnter={() => setHoveredItem('all-attendees')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'all-attendees' })}
                    >
                      <MdPeople style={iconStyle} />
                      {t('all_attendees')}
                    </NavLink>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/admin/church-users"
                      onMouseEnter={() => setHoveredItem('church-users')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'church-users' })}
                    >
                      <MdGroupAdd style={iconStyle} />
                      {t('team_members')}
                    </NavLink>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/admin/church-settings"
                      onMouseEnter={() => setHoveredItem('church-settings')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'church-settings' })}
                    >
                      <MdSettings style={iconStyle} />
                      {t('church_settings')}
                    </NavLink>
                  </li>
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
                      to="/admin/statistics"
                      onMouseEnter={() => setHoveredItem('statistics')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'statistics' })}
                    >
                      <MdLeaderboard style={iconStyle} />
                      {t('statistics')}
                    </NavLink>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/admin/history"
                      onMouseEnter={() => setHoveredItem('event-history')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'event-history' })}
                    >
                      <MdHistory style={iconStyle} />
                      {t('event_history')}
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>

        {/* Footer avec déconnexion et langue */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #374151' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px 12px',
              cursor: 'pointer',
              backgroundColor: '#dc2626',
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
            onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
          >
            <MdLogout style={{ marginRight: '8px', fontSize: '18px' }} />
            {t('logout')}
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

export default AdminLayout;
