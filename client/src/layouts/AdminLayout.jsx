import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import defaultLogo from '../assets/logo_eden.png';
import {
  MdEvent, MdLeaderboard, MdExpandMore, MdExpandLess, MdSettings,
  MdGroupAdd, MdHistory, MdLogout, MdDashboard, MdPeople,
  MdPersonAdd, MdBadge, MdAnnouncement, MdMail, MdAccountCircle,
  MdEventAvailable, MdMusicNote, MdLibraryMusic, MdCalendarMonth,
  MdMenu, MdClose, MdPlaylistPlay, MdGroups, MdAssignment, MdSend
} from 'react-icons/md';
import { api } from '../api/api';
import { supabase } from '../supabaseClient';
import ChurchSuspendedPage from '../pages/ChurchSuspendedPage';

function AdminLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [churchId, setChurchId] = useState(null);
  const [churchDetails, setChurchDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState(null);
  const hasRun = useRef(false);

  // Permissions et rôle principal
  const [permissions, setPermissions] = useState(['all']);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminPhotoUrl, setAdminPhotoUrl] = useState(null);

  // Modules activés pour cette église (définis par le Super Admin)
  const [enabledModules, setEnabledModules] = useState(['events', 'members', 'meetings', 'choir']);

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // État pour le module actif (events ou members)
  const [activeModule, setActiveModule] = useState(() => {
    return localStorage.getItem('adminActiveModule') || 'events';
  });

  const [openSections, setOpenSections] = useState({
    events: true,
    members: true,
    choir: true,
    meetings: true,
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

        const currentModule = localStorage.getItem('adminActiveModule') || 'events';
        const userPermissions = userInfo.permissions || ['all'];
        if (userPermissions.includes('none')) {
          // Aucune permission → pas de module actif
          setActiveModule('none');
          localStorage.setItem('adminActiveModule', 'none');
        } else if (!userPermissions.includes('all') && !userPermissions.includes(currentModule)) {
          const firstPermission = userPermissions[0];
          setActiveModule(firstPermission);
          localStorage.setItem('adminActiveModule', firstPermission);
        }

        try {
          const details = await api.admin.getChurchDetails(currentChurchId);
          if (!isCancelled) {
            setChurchDetails(details);
            // Récupérer les modules activés par le Super Admin
            if (details.enabled_modules && Array.isArray(details.enabled_modules)) {
              setEnabledModules(details.enabled_modules);
              // Vérifier si le module actif est toujours disponible
              const currentModule = localStorage.getItem('adminActiveModule') || 'events';
              if (!details.enabled_modules.includes(currentModule)) {
                const firstEnabledModule = details.enabled_modules[0] || 'events';
                setActiveModule(firstEnabledModule);
                localStorage.setItem('adminActiveModule', firstEnabledModule);
              }
            }
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

        // Vérifier si l'église est suspendue
        if (err.response?.data?.error === 'CHURCH_SUSPENDED') {
          console.log('=== AdminLayout: Church is suspended ===');
          setIsSuspended(true);
          setSuspensionReason(err.response?.data?.reason || null);
          setLoading(false);
          return;
        }

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

  const hasPermission = (module) => {
    if (permissions.includes('all')) return true;
    return permissions.includes(module);
  };

  // Vérifie si un module est disponible (activé par Super Admin ET autorisé par permissions)
  const isModuleAvailable = (module) => {
    return enabledModules.includes(module) && hasPermission(module);
  };

  const handleModuleChange = (module) => {
    setActiveModule(module);
    localStorage.setItem('adminActiveModule', module);
    if (module === 'events') {
      navigate('/admin/dashboard');
    } else if (module === 'members') {
      navigate('/admin/members-dashboard');
    } else if (module === 'choir') {
      navigate('/admin/choir');
    } else if (module === 'meetings') {
      navigate('/admin/meetings-dashboard');
    }
    setSidebarOpen(false);
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

  const closeSidebarOnMobile = () => {
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-300 text-lg">{t('loading')}...</div>
      </div>
    );
  }

  // Afficher la page de suspension si l'église est suspendue
  if (isSuspended) {
    return <ChurchSuspendedPage reason={suspensionReason} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-lg">{error}</div>
      </div>
    );
  }

  if (userRole !== 'super_admin' && userRole !== 'church_admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-lg">{t('forbidden_access')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50
        w-72 h-screen bg-gray-800 border-r border-gray-700
        transform transition-transform duration-300 ease-in-out
        flex flex-col shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Close button mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white z-10"
        >
          <MdClose size={24} />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Logo église et profil admin */}
          <div className="text-center mb-5">
            <div className="flex justify-center items-center gap-2 mb-2">
              <img
                src={churchDetails?.logo_url || defaultLogo}
                alt={churchDetails?.name || 'MY EDEN X'}
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 border-indigo-500"
              />
              {adminPhotoUrl ? (
                <img
                  src={adminPhotoUrl}
                  alt={adminName}
                  className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 border-green-500"
                />
              ) : (
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-gray-700 border-2 border-green-500 flex items-center justify-center text-gray-400 font-bold">
                  {adminName?.charAt(0)?.toUpperCase() || 'A'}
                </div>
              )}
            </div>
            <h3 className="text-white text-sm font-bold truncate px-2">
              {churchDetails?.name || 'MY EDEN X'}
            </h3>
            <p className="text-green-400 text-xs font-medium truncate px-2">{adminName}</p>
            <p className="text-gray-500 text-[10px]">{t('church_management_platform')}</p>
          </div>

          {/* Sélecteur de Module */}
          <div className="mb-5 p-1 bg-gray-900 rounded-lg flex flex-wrap gap-1">
            {isModuleAvailable('events') && (
              <button
                onClick={() => handleModuleChange('events')}
                className={`flex-1 min-w-[60px] py-2 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                  activeModule === 'events'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <MdEvent size={14} />
                <span className="hidden sm:inline">{t('events_module') || 'Événements'}</span>
                <span className="sm:hidden">Évén.</span>
              </button>
            )}
            {isModuleAvailable('members') && (
              <button
                onClick={() => handleModuleChange('members')}
                className={`flex-1 min-w-[60px] py-2 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                  activeModule === 'members'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <MdPeople size={14} />
                <span className="hidden sm:inline">{t('members_module') || 'Membres'}</span>
                <span className="sm:hidden">Memb.</span>
              </button>
            )}
            {isModuleAvailable('choir') && (
              <button
                onClick={() => handleModuleChange('choir')}
                className={`flex-1 min-w-[60px] py-2 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                  activeModule === 'choir'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <MdMusicNote size={14} />
                <span className="hidden sm:inline">{t('choir_module') || 'Chorale'}</span>
                <span className="sm:hidden">Chor.</span>
              </button>
            )}
            {isModuleAvailable('meetings') && (
              <button
                onClick={() => handleModuleChange('meetings')}
                className={`flex-1 min-w-[60px] py-2 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                  activeModule === 'meetings'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <MdGroups size={14} />
                <span className="hidden sm:inline">{t('meetings_module') || 'Réunions'}</span>
                <span className="sm:hidden">Réun.</span>
              </button>
            )}
          </div>

          {/* Message si aucun module disponible */}
          {!isModuleAvailable('events') && !isModuleAvailable('members') && !isModuleAvailable('choir') && !isModuleAvailable('meetings') && (
            <div className="p-4 bg-gray-700 rounded-lg mb-5 text-center">
              <p className="text-yellow-400 text-sm">
                {t('no_module_access') || 'Aucun module disponible. Contactez l\'administrateur de la plateforme.'}
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-2">
            {/* Module Événements */}
            {activeModule === 'events' && isModuleAvailable('events') && (
              <>
                {/* Section Gestion des Événements */}
                <div className="mb-2">
                  <button
                    onClick={() => toggleSection('events')}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 rounded-lg text-white font-semibold text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <MdEvent size={18} />
                      {t('event_management') || 'Gestion Événements'}
                    </span>
                    {openSections.events ? <MdExpandLess /> : <MdExpandMore />}
                  </button>
                  {openSections.events && (
                    <div className="mt-1 ml-2 space-y-1">
                      <NavLink
                        to="/admin/dashboard"
                        onClick={closeSidebarOnMobile}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`
                        }
                      >
                        <MdDashboard size={18} />
                        {t('dashboard')}
                      </NavLink>
                      <NavLink
                        to="/admin/events"
                        onClick={closeSidebarOnMobile}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`
                        }
                      >
                        <MdEvent size={18} />
                        {t('events')}
                      </NavLink>
                      <NavLink
                        to="/admin/all-attendees"
                        onClick={closeSidebarOnMobile}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`
                        }
                      >
                        <MdPeople size={18} />
                        {t('all_attendees')}
                      </NavLink>
                    </div>
                  )}
                </div>

                {/* Section Rapports et Statistiques */}
                <div className="mb-2">
                  <button
                    onClick={() => toggleSection('reportsAndStats')}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 rounded-lg text-white font-semibold text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <MdLeaderboard size={18} />
                      {t('reports_and_stats')}
                    </span>
                    {openSections.reportsAndStats ? <MdExpandLess /> : <MdExpandMore />}
                  </button>
                  {openSections.reportsAndStats && (
                    <div className="mt-1 ml-2 space-y-1">
                      <NavLink
                        to="/admin/statistics"
                        onClick={closeSidebarOnMobile}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`
                        }
                      >
                        <MdLeaderboard size={18} />
                        {t('statistics')}
                      </NavLink>
                      <NavLink
                        to="/admin/history"
                        onClick={closeSidebarOnMobile}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`
                        }
                      >
                        <MdHistory size={18} />
                        {t('event_history')}
                      </NavLink>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Module Membres */}
            {activeModule === 'members' && isModuleAvailable('members') && (
              <div className="mb-2">
                <button
                  onClick={() => toggleSection('members')}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 rounded-lg text-white font-semibold text-sm"
                >
                  <span className="flex items-center gap-2">
                    <MdPeople size={18} />
                    {t('member_management') || 'Gestion Membres'}
                  </span>
                  {openSections.members ? <MdExpandLess /> : <MdExpandMore />}
                </button>
                {openSections.members && (
                  <div className="mt-1 ml-2 space-y-1">
                    <NavLink
                      to="/admin/members-dashboard"
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdDashboard size={18} />
                      {t('dashboard')}
                    </NavLink>
                    <NavLink
                      to="/admin/members"
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdPeople size={18} />
                      {t('members') || 'Membres'}
                    </NavLink>
                    <NavLink
                      to="/admin/roles"
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdBadge size={18} />
                      {t('roles') || 'Rôles'}
                    </NavLink>
                    <NavLink
                      to="/admin/member-invitations"
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdMail size={18} />
                      {t('invitations') || 'Invitations'}
                    </NavLink>
                    <NavLink
                      to="/admin/announcements"
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdAnnouncement size={18} />
                      {t('announcements') || 'Annonces'}
                    </NavLink>
                  </div>
                )}
              </div>
            )}

            {/* Module Chorale */}
            {activeModule === 'choir' && isModuleAvailable('choir') && (
              <div className="mb-2">
                <button
                  onClick={() => toggleSection('choir')}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 rounded-lg text-white font-semibold text-sm"
                >
                  <span className="flex items-center gap-2">
                    <MdMusicNote size={18} />
                    {t('choir_management') || 'Gestion Chorale'}
                  </span>
                  {openSections.choir ? <MdExpandLess /> : <MdExpandMore />}
                </button>
                {openSections.choir && (
                  <div className="mt-1 ml-2 space-y-1">
                    <NavLink
                      to="/admin/choir"
                      end
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdDashboard size={18} />
                      {t('dashboard')}
                    </NavLink>
                    <NavLink
                      to="/admin/choir/members"
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdPeople size={18} />
                      {t('choir.choristers') || 'Choristes'}
                    </NavLink>
                    <NavLink
                      to="/admin/choir/songs"
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdLibraryMusic size={18} />
                      {t('choir.repertoire') || 'Répertoire'}
                    </NavLink>
                    <NavLink
                      to="/admin/choir/compilations"
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdPlaylistPlay size={18} />
                      {t('choir.compilations') || 'Compilations'}
                    </NavLink>
                    <NavLink
                      to="/admin/choir/planning"
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdCalendarMonth size={18} />
                      {t('choir.planning') || 'Planning'}
                    </NavLink>
                  </div>
                )}
              </div>
            )}

            {/* Module Réunions */}
            {activeModule === 'meetings' && isModuleAvailable('meetings') && (
              <div className="mb-2">
                <button
                  onClick={() => toggleSection('meetings')}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 rounded-lg text-white font-semibold text-sm"
                >
                  <span className="flex items-center gap-2">
                    <MdGroups size={18} />
                    {t('meetings.management') || 'Gestion Réunions'}
                  </span>
                  {openSections.meetings ? <MdExpandLess /> : <MdExpandMore />}
                </button>
                {openSections.meetings && (
                  <div className="mt-1 ml-2 space-y-1">
                    <NavLink
                      to="/admin/meetings-dashboard"
                      end
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdDashboard size={18} />
                      {t('dashboard')}
                    </NavLink>
                    <NavLink
                      to="/admin/meetings"
                      end
                      onClick={closeSidebarOnMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <MdGroups size={18} />
                      {t('meetings.all_meetings') || 'Toutes les réunions'}
                    </NavLink>
                  </div>
                )}
              </div>
            )}

            {/* Section Mon Espace */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={() => toggleSection('mySpace')}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 rounded-lg text-white font-semibold text-sm"
              >
                <span className="flex items-center gap-2">
                  <MdAccountCircle size={18} />
                  {t('my_space') || 'Mon Espace'}
                </span>
                {openSections.mySpace ? <MdExpandLess /> : <MdExpandMore />}
              </button>
              {openSections.mySpace && (
                <div className="mt-1 ml-2 space-y-1">
                  <NavLink
                    to="/admin/my-profile"
                    onClick={closeSidebarOnMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`
                    }
                  >
                    <MdAccountCircle size={18} />
                    {t('my_profile') || 'Mon Profil'}
                  </NavLink>
                  <NavLink
                    to="/admin/my-events"
                    onClick={closeSidebarOnMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`
                    }
                  >
                    <MdEventAvailable size={18} />
                    {t('my_events') || 'Mes Événements'}
                  </NavLink>
                </div>
              )}
            </div>

            {/* Équipe et Paramètres (Admin principal uniquement) */}
            {isMainAdmin && (
              <div className="mt-2 space-y-1">
                <NavLink
                  to="/admin/church-users"
                  onClick={closeSidebarOnMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`
                  }
                >
                  <MdGroupAdd size={18} />
                  {t('team_members')}
                </NavLink>
                <NavLink
                  to="/admin/activity-logs"
                  onClick={closeSidebarOnMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`
                  }
                >
                  <MdHistory size={18} />
                  {t('activity_logs') || 'Journaux d\'activité'}
                </NavLink>
                <NavLink
                  to="/admin/church-settings"
                  onClick={closeSidebarOnMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`
                  }
                >
                  <MdSettings size={18} />
                  {t('church_settings')}
                </NavLink>
              </div>
            )}
          </nav>
        </div>

        {/* Footer avec déconnexion et langue */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors mb-3"
          >
            <MdLogout size={18} />
            {t('logout')}
          </button>

          <div className="flex justify-center gap-2">
            <button
              onClick={() => handleLanguageChange('fr')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                i18n.language === 'fr'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                i18n.language === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-auto">
        {/* Mobile header */}
        <header className="lg:hidden bg-gray-800 border-b border-gray-700 p-4 flex items-center gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-300 hover:text-white"
          >
            <MdMenu size={24} />
          </button>
          <img
            src={churchDetails?.logo_url || defaultLogo}
            alt={churchDetails?.name || 'MY EDEN X'}
            className="w-8 h-8 rounded-full object-cover border border-indigo-500"
          />
          <span className="text-white font-medium truncate flex-1">
            {churchDetails?.name || 'MY EDEN X'}
          </span>
          {adminPhotoUrl ? (
            <img
              src={adminPhotoUrl}
              alt={adminName}
              className="w-8 h-8 rounded-full object-cover border border-green-500"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-700 border border-green-500 flex items-center justify-center text-gray-400 text-xs font-bold">
              {adminName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 text-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
