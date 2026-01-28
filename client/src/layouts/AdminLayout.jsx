import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import defaultLogo from '../assets/logo_eden.png';
import {
  MdEvent, MdLeaderboard, MdExpandMore, MdExpandLess, MdSettings,
  MdGroupAdd, MdHistory, MdLogout, MdDashboard, MdPeople,
  MdPersonAdd, MdBadge, MdAnnouncement, MdMail, MdAccountCircle,
  MdEventAvailable, MdMusicNote, MdLibraryMusic, MdCalendarMonth
} from 'react-icons/md';
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
  const hasRun = useRef(false);

  // Permissions et rôle principal
  const [permissions, setPermissions] = useState(['all']);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminPhotoUrl, setAdminPhotoUrl] = useState(null);

  // État pour le module actif (events ou members)
  const [activeModule, setActiveModule] = useState(() => {
    // Récupérer le module actif depuis localStorage
    return localStorage.getItem('adminActiveModule') || 'events';
  });

  const [openSections, setOpenSections] = useState({
    events: true,
    members: true,
    choir: true,
    reportsAndStats: false,
    mySpace: true,
  });

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    let isCancelled = false;

    const fetchAuthInfoAndChurchDetails = async () => {
      console.log('=== AdminLayout: Starting authentication check (once) ===');

      try {
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
        setPermissions(userInfo.permissions || ['all']);
        setIsMainAdmin(userInfo.is_main_admin || false);
        setAdminName(userInfo.full_name || userInfo.email);
        setAdminPhotoUrl(userInfo.profile_photo_url || null);

        // Si l'utilisateur n'a pas accès au module actif, rediriger vers un module autorisé
        const currentModule = localStorage.getItem('adminActiveModule') || 'events';
        const userPermissions = userInfo.permissions || ['all'];
        if (!userPermissions.includes('all') && !userPermissions.includes(currentModule)) {
          const firstPermission = userPermissions[0];
          setActiveModule(firstPermission);
          localStorage.setItem('adminActiveModule', firstPermission);
        }

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

    return () => {
      isCancelled = true;
    };
  }, [navigate]);

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Vérifier si l'utilisateur a accès à un module
  const hasPermission = (module) => {
    if (permissions.includes('all')) return true;
    return permissions.includes(module);
  };

  // Changer de module et sauvegarder dans localStorage + rediriger vers le dashboard du module
  const handleModuleChange = (module) => {
    setActiveModule(module);
    localStorage.setItem('adminActiveModule', module);
    // Rediriger vers le tableau de bord du module sélectionné
    if (module === 'events') {
      navigate('/admin/dashboard');
    } else if (module === 'members') {
      navigate('/admin/members-dashboard');
    } else if (module === 'choir') {
      navigate('/admin/choir');
    }
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

  const getModuleButtonStyle = (module) => ({
    flex: 1,
    padding: '10px 8px',
    cursor: 'pointer',
    backgroundColor: activeModule === module ? '#4f46e5' : '#374151',
    color: '#fff',
    border: 'none',
    borderRadius: activeModule === module ? '6px' : '4px',
    fontSize: '12px',
    fontWeight: activeModule === module ? 'bold' : 'normal',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    boxShadow: activeModule === module ? '0 2px 8px rgba(79, 70, 229, 0.4)' : 'none',
  });

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
        width: '280px',
        background: '#1f2937',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid #374151',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto'
      }}>
        <div>
          {/* Logo église et profil admin */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {/* Logo et photo admin côte à côte */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px'
            }}>
              {/* Logo de l'église */}
              <img
                src={churchDetails?.logo_url || defaultLogo}
                alt={churchDetails?.name || 'MY EDEN X'}
                style={{
                  width: '55px',
                  height: '55px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #4f46e5'
                }}
              />
              {/* Photo de l'admin */}
              {adminPhotoUrl ? (
                <img
                  src={adminPhotoUrl}
                  alt={adminName}
                  style={{
                    width: '55px',
                    height: '55px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #22c55e'
                  }}
                />
              ) : (
                <div style={{
                  width: '55px',
                  height: '55px',
                  borderRadius: '50%',
                  backgroundColor: '#374151',
                  border: '2px solid #22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  {adminName?.charAt(0)?.toUpperCase() || 'A'}
                </div>
              )}
            </div>
            {/* Nom de l'église */}
            <h3 style={{
              color: '#f3f4f6',
              marginTop: '5px',
              marginBottom: '2px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {churchDetails?.name || 'MY EDEN X'}
            </h3>
            {/* Nom de l'admin */}
            <p style={{ color: '#22c55e', fontSize: '12px', fontWeight: '500', margin: '2px 0' }}>
              {adminName}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '10px' }}>
              {t('church_management_platform')}
            </p>
          </div>

          {/* Sélecteur de Module - Affiche uniquement les modules autorisés */}
          <div style={{
            marginBottom: '20px',
            padding: '4px',
            backgroundColor: '#111827',
            borderRadius: '8px',
            display: 'flex',
            gap: '4px'
          }}>
            {hasPermission('events') && (
              <button
                onClick={() => handleModuleChange('events')}
                style={getModuleButtonStyle('events')}
              >
                <MdEvent size={16} />
                {t('events_module') || 'Événements'}
              </button>
            )}
            {hasPermission('members') && (
              <button
                onClick={() => handleModuleChange('members')}
                style={getModuleButtonStyle('members')}
              >
                <MdPeople size={16} />
                {t('members_module') || 'Membres'}
              </button>
            )}
            {hasPermission('choir') && (
              <button
                onClick={() => handleModuleChange('choir')}
                style={getModuleButtonStyle('choir')}
              >
                <MdMusicNote size={16} />
                {t('choir_module') || 'Chorale'}
              </button>
            )}
          </div>

          {/* Message si aucun module autorisé */}
          {!hasPermission('events') && !hasPermission('members') && !hasPermission('choir') && (
            <div style={{
              padding: '15px',
              backgroundColor: '#374151',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <p style={{ color: '#fbbf24', fontSize: '13px', margin: 0 }}>
                {t('no_module_access') || 'Aucun module autorisé. Contactez l\'administrateur principal.'}
              </p>
            </div>
          )}

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {/* Module Événements - Visible uniquement si autorisé */}
            {activeModule === 'events' && hasPermission('events') && (
              <>
                {/* Section Gestion des Événements */}
                <li style={{ marginBottom: '10px' }}>
                  <div
                    onClick={() => toggleSection('events')}
                    style={{ ...getLinkStyle({ itemName: 'events', isParent: true }), cursor: 'pointer' }}
                  >
                    <MdEvent style={iconStyle} />
                    {t('event_management') || 'Gestion Événements'}
                    {openSections.events ? (
                      <MdExpandLess style={toggleIconStyle} />
                    ) : (
                      <MdExpandMore style={toggleIconStyle} />
                    )}
                  </div>
                  {openSections.events && (
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
              </>
            )}

            {/* Module Membres - Visible uniquement si autorisé */}
            {activeModule === 'members' && hasPermission('members') && (
              <>
                {/* Section Gestion des Membres */}
                <li style={{ marginBottom: '10px' }}>
                  <div
                    onClick={() => toggleSection('members')}
                    style={{ ...getLinkStyle({ itemName: 'members', isParent: true }), cursor: 'pointer' }}
                  >
                    <MdPeople style={iconStyle} />
                    {t('member_management') || 'Gestion Membres'}
                    {openSections.members ? (
                      <MdExpandLess style={toggleIconStyle} />
                    ) : (
                      <MdExpandMore style={toggleIconStyle} />
                    )}
                  </div>
                  {openSections.members && (
                    <ul style={{ listStyle: 'none', paddingLeft: '20px', marginTop: '5px' }}>
                      <li style={{ marginBottom: '5px' }}>
                        <NavLink
                          to="/admin/members-dashboard"
                          onMouseEnter={() => setHoveredItem('members-dashboard')}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={({ isActive }) => getLinkStyle({ isActive, itemName: 'members-dashboard' })}
                        >
                          <MdDashboard style={iconStyle} />
                          {t('dashboard')}
                        </NavLink>
                      </li>
                      <li style={{ marginBottom: '5px' }}>
                        <NavLink
                          to="/admin/members"
                          onMouseEnter={() => setHoveredItem('members-list')}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={({ isActive }) => getLinkStyle({ isActive, itemName: 'members-list' })}
                        >
                          <MdPeople style={iconStyle} />
                          {t('members') || 'Membres'}
                        </NavLink>
                      </li>
                      <li style={{ marginBottom: '5px' }}>
                        <NavLink
                          to="/admin/roles"
                          onMouseEnter={() => setHoveredItem('roles')}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={({ isActive }) => getLinkStyle({ isActive, itemName: 'roles' })}
                        >
                          <MdBadge style={iconStyle} />
                          {t('roles') || 'Rôles'}
                        </NavLink>
                      </li>
                      <li style={{ marginBottom: '5px' }}>
                        <NavLink
                          to="/admin/member-invitations"
                          onMouseEnter={() => setHoveredItem('invitations')}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={({ isActive }) => getLinkStyle({ isActive, itemName: 'invitations' })}
                        >
                          <MdMail style={iconStyle} />
                          {t('invitations') || 'Invitations'}
                        </NavLink>
                      </li>
                      <li style={{ marginBottom: '5px' }}>
                        <NavLink
                          to="/admin/announcements"
                          onMouseEnter={() => setHoveredItem('announcements')}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={({ isActive }) => getLinkStyle({ isActive, itemName: 'announcements' })}
                        >
                          <MdAnnouncement style={iconStyle} />
                          {t('announcements') || 'Annonces'}
                        </NavLink>
                      </li>
                    </ul>
                  )}
                </li>
              </>
            )}

            {/* Module Chorale - Visible uniquement si autorisé */}
            {activeModule === 'choir' && hasPermission('choir') && (
              <>
                {/* Section Gestion de la Chorale */}
                <li style={{ marginBottom: '10px' }}>
                  <div
                    onClick={() => toggleSection('choir')}
                    style={{ ...getLinkStyle({ itemName: 'choir', isParent: true }), cursor: 'pointer' }}
                  >
                    <MdMusicNote style={iconStyle} />
                    {t('choir_management') || 'Gestion Chorale'}
                    {openSections.choir ? (
                      <MdExpandLess style={toggleIconStyle} />
                    ) : (
                      <MdExpandMore style={toggleIconStyle} />
                    )}
                  </div>
                  {openSections.choir && (
                    <ul style={{ listStyle: 'none', paddingLeft: '20px', marginTop: '5px' }}>
                      <li style={{ marginBottom: '5px' }}>
                        <NavLink
                          to="/admin/choir"
                          end
                          onMouseEnter={() => setHoveredItem('choir-dashboard')}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={({ isActive }) => getLinkStyle({ isActive, itemName: 'choir-dashboard' })}
                        >
                          <MdDashboard style={iconStyle} />
                          {t('dashboard')}
                        </NavLink>
                      </li>
                      <li style={{ marginBottom: '5px' }}>
                        <NavLink
                          to="/admin/choir/members"
                          onMouseEnter={() => setHoveredItem('choir-members')}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={({ isActive }) => getLinkStyle({ isActive, itemName: 'choir-members' })}
                        >
                          <MdPeople style={iconStyle} />
                          {t('choir.choristers') || 'Choristes'}
                        </NavLink>
                      </li>
                      <li style={{ marginBottom: '5px' }}>
                        <NavLink
                          to="/admin/choir/songs"
                          onMouseEnter={() => setHoveredItem('choir-songs')}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={({ isActive }) => getLinkStyle({ isActive, itemName: 'choir-songs' })}
                        >
                          <MdLibraryMusic style={iconStyle} />
                          {t('choir.repertoire') || 'Répertoire'}
                        </NavLink>
                      </li>
                      <li style={{ marginBottom: '5px' }}>
                        <NavLink
                          to="/admin/choir/planning"
                          onMouseEnter={() => setHoveredItem('choir-planning')}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={({ isActive }) => getLinkStyle({ isActive, itemName: 'choir-planning' })}
                        >
                          <MdCalendarMonth style={iconStyle} />
                          {t('choir.planning') || 'Planning'}
                        </NavLink>
                      </li>
                    </ul>
                  )}
                </li>
              </>
            )}

            {/* Section Mon Espace - Visible pour tous les admins */}
            <li style={{ marginTop: '20px', borderTop: '1px solid #374151', paddingTop: '15px', marginBottom: '10px' }}>
              <div
                onClick={() => toggleSection('mySpace')}
                style={{ ...getLinkStyle({ itemName: 'mySpace', isParent: true }), cursor: 'pointer' }}
              >
                <MdAccountCircle style={iconStyle} />
                {t('my_space') || 'Mon Espace'}
                {openSections.mySpace ? (
                  <MdExpandLess style={toggleIconStyle} />
                ) : (
                  <MdExpandMore style={toggleIconStyle} />
                )}
              </div>
              {openSections.mySpace && (
                <ul style={{ listStyle: 'none', paddingLeft: '20px', marginTop: '5px' }}>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/admin/my-profile"
                      onMouseEnter={() => setHoveredItem('my-profile')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'my-profile' })}
                    >
                      <MdAccountCircle style={iconStyle} />
                      {t('my_profile') || 'Mon Profil'}
                    </NavLink>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/admin/my-events"
                      onMouseEnter={() => setHoveredItem('my-events')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'my-events' })}
                    >
                      <MdEventAvailable style={iconStyle} />
                      {t('my_events') || 'Mes Événements'}
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>

            {/* Section commune : Paramètres */}
            {/* Membres de l'équipe - Visible uniquement pour l'admin principal */}
            {isMainAdmin && (
              <>
                <li style={{ marginTop: '10px', marginBottom: '5px' }}>
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
                    to="/admin/activity-logs"
                    onMouseEnter={() => setHoveredItem('activity-logs')}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={({ isActive }) => getLinkStyle({ isActive, itemName: 'activity-logs' })}
                  >
                    <MdHistory style={iconStyle} />
                    {t('activity_logs') || 'Journaux d\'activité'}
                  </NavLink>
                </li>
              </>
            )}
            {/* Paramètres de l'église - Visible uniquement pour l'admin principal */}
            {isMainAdmin && (
              <li style={{
                marginBottom: '5px',
                marginTop: '5px'
              }}>
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
            )}
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
