import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import defaultLogo from '../assets/logo_eden.jpg';
import { MdEvent, MdLeaderboard, MdExpandMore, MdExpandLess, MdSettings, MdGroupAdd, MdHistory } from 'react-icons/md';
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
    reportsAndStats: true,
  });

  useEffect(() => {
    const fetchAuthInfoAndChurchDetails = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error('No active session.');
        }

        const { user } = session;
        
        // Simulating the user_metadata or directly getting from localstorage
        const storedToken = localStorage.getItem('supabase.auth.token');
        let parsedUser = null;
        if (storedToken) {
            try {
                parsedUser = JSON.parse(storedToken).user;
            } catch (e) {
                console.error("Error parsing user token:", e);
            }
        }
        
        const currentUserRole = parsedUser?.user_metadata?.church_role;
        const currentChurchId = parsedUser?.user_metadata?.church_id;

        if (!currentUserRole || !currentChurchId) {
            setError(t('error_loading_user_data'));
            navigate('/admin/login');
            return;
        }

        setUserRole(currentUserRole);
        setChurchId(currentChurchId);

        const details = await api.admin.getChurchDetails(currentChurchId);
        setChurchDetails(details);
        
      } catch (err) {
        console.error('Error loading auth info or church details:', err);
        setError(t('error_loading_user_data'));
        navigate('/admin/login');
      } finally {
        setLoading(false);
      }
    };
    fetchAuthInfoAndChurchDetails();
  }, [t, navigate]);

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
      color: '#333',
    };

    if (isParent) {
      return {
        ...baseStyle,
        backgroundColor: '#e0e0e0',
        fontWeight: 'bold',
        marginBottom: '5px',
        color: '#000',
      };
    }

    if (isActive) {
      return {
        ...baseStyle,
        backgroundColor: '#007bff',
        color: '#fff',
      };
    }
    if (isHovered) {
      return {
        ...baseStyle,
        backgroundColor: '#e9ecef',
      };
    }
    return {
      ...baseStyle,
      backgroundColor: 'transparent',
    };
  };

  const iconStyle = { marginRight: '10px' };
  const toggleIconStyle = { marginLeft: 'auto', fontSize: '1.2em', color: '#333' };

  if (loading) {
    return <div>{t('loading')}...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (userRole === 'super_admin') {
    navigate('/super-admin/dashboard');
    return null;
  }

  if (userRole !== 'church_admin') {
      return <div className="text-red-500">{t('forbidden_access')}</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: '250px', background: '#f4f4f4', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <img 
            src={churchDetails?.logo_url || defaultLogo}
            alt={churchDetails?.name || t('app_name')} 
            style={{ maxWidth: '150px', height: 'auto', display: 'block', borderRadius: '100px', objectFit: 'contain' }}
          />
          <h3>{churchDetails?.name || t('admin_menu')}</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
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
                      to="/admin/event-history"
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
        
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #ddd', marginBottom: '15px' }}>
          <p style={{ marginBottom: '10px' }}>{t('language_switcher')}:</p>
          <button onClick={() => handleLanguageChange('fr')} style={{ marginRight: '5px', padding: '8px 12px', cursor: 'pointer', fontWeight: i18n.language === 'fr' ? 'bold' : 'normal' }}>FR</button>
          <button onClick={() => handleLanguageChange('en')} style={{ padding: '8px 12px', cursor: 'pointer', fontWeight: i18n.language === 'en' ? 'bold' : 'normal' }}>EN</button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;