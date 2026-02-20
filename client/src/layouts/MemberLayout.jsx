import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { supabase } from '../supabaseClient';
import defaultLogo from '../assets/logo_eden.png';
import LoadingSpinner from '../components/LoadingSpinner';
import { setAppBadge, clearAppBadge } from '../utils/pwaBadge';
import {
  MdDashboard, MdPerson, MdEvent, MdBadge, MdNotifications,
  MdAnnouncement, MdLogout, MdMenu, MdClose, MdGroups, MdMusicNote
} from 'react-icons/md';

function MemberLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memberInfo, setMemberInfo] = useState(null);
  const [churchInfo, setChurchInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isChoirMember, setIsChoirMember] = useState(false);
  const [memberProfile, setMemberProfile] = useState(null);
  const [enabledModules, setEnabledModules] = useState(['events', 'members', 'meetings', 'choir']);

  useEffect(() => {
    const fetchMemberInfo = async () => {
      try {
        const userInfo = await api.auth.me();

        if (userInfo.church_role !== 'member') {
          navigate('/member/login');
          return;
        }

        setMemberInfo(userInfo);

        // Récupérer les infos du dashboard membre
        const dashboardData = await api.member.getDashboard();
        setChurchInfo(dashboardData.church);
        if (dashboardData.member) setMemberProfile(dashboardData.member);
        const initialCount = dashboardData.unread_notifications || 0;
        setUnreadNotifications(initialCount);
        setAppBadge(initialCount);

        // Modules activés par le Super Admin pour cette église
        if (dashboardData.church?.enabled_modules && Array.isArray(dashboardData.church.enabled_modules)) {
          setEnabledModules(dashboardData.church.enabled_modules);
        }

        // Vérifier le statut chorale
        if (dashboardData.choir_status?.is_member) {
          setIsChoirMember(true);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching member info:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('supabase.auth.token');
          navigate('/member/login');
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchMemberInfo();
  }, [navigate]);

  // Rafraîchir le compteur de notifications toutes les minutes
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.member.getNotificationsUnreadCount();
        const count = data.count || 0;
        setUnreadNotifications(count);
        setAppBadge(count);
      } catch { /* silencieux */ }
    }, 60000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('supabase.auth.token');
      navigate('/member/login');
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  // Vérifie si un module est activé pour cette église par le Super Admin
  const isModuleEnabled = (module) => enabledModules.includes(module);

  const navItems = [
    // Toujours visibles (données personnelles)
    { path: '/member/dashboard', icon: MdDashboard, label: t('member_dashboard') },
    { path: '/member/profile', icon: MdPerson, label: t('my_profile') },
    // Module Événements
    ...(isModuleEnabled('events') ? [
      { path: '/member/events', icon: MdEvent, label: t('my_events') }
    ] : []),
    // Module Réunions
    ...(isModuleEnabled('meetings') ? [
      { path: '/member/meetings', icon: MdGroups, label: t('meetings.title') }
    ] : []),
    // Module Membres (rôles, annonces)
    ...(isModuleEnabled('members') ? [
      { path: '/member/roles', icon: MdBadge, label: t('my_roles') },
      { path: '/member/announcements', icon: MdAnnouncement, label: t('my_announcements') },
    ] : []),
    // Module Chorale - visible uniquement si activé ET membre de la chorale
    ...(isModuleEnabled('choir') && isChoirMember ? [{
      path: '/member/choir',
      icon: MdMusicNote,
      label: t('member_choir.choir'),
    }] : []),
    // Notifications - toujours visible
    {
      path: '/member/notifications',
      icon: MdNotifications,
      label: t('notifications'),
      badge: unreadNotifications > 0 ? unreadNotifications : null
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-lg">{error}</div>
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
        w-64 h-screen bg-gray-800 border-r border-gray-700
        transform transition-transform duration-300 ease-in-out shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header with logo + member photo */}
          <div className="p-4 border-b border-gray-700 relative">
            {/* Close button mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white z-10"
            >
              <MdClose size={24} />
            </button>
            {/* Church info */}
            <div className="flex items-center gap-3 mb-3">
              <img
                src={churchInfo?.logo_url || defaultLogo}
                alt={churchInfo?.name || 'MY EDEN X'}
                className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500"
              />
              <h2 className="text-white font-semibold text-sm truncate">
                {churchInfo?.name || 'MY EDEN X'}
              </h2>
            </div>
            {/* Member photo + name — clic → page profil */}
            <button
              onClick={() => { navigate('/member/profile'); setSidebarOpen(false); }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none text-left w-full"
              title={t('my_profile') || 'Mon Profil'}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500 flex-shrink-0">
                {memberProfile?.profile_photo_url ? (
                  <img
                    src={memberProfile.profile_photo_url}
                    alt={memberProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-600 flex items-center justify-center text-white text-sm font-bold">
                    {memberProfile?.full_name?.charAt(0)?.toUpperCase() || <MdPerson size={18} />}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {memberProfile?.full_name || memberInfo?.full_name || ''}
                </p>
                <p className="text-gray-400 text-xs">{t('my_profile') || 'Mon Profil'}</p>
              </div>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 space-y-3">
            {/* Language switcher */}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => changeLanguage('fr')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  i18n.language === 'fr'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                FR
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  i18n.language === 'en'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                EN
              </button>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <MdLogout size={20} />
              {t('logout')}
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
            src={churchInfo?.logo_url || defaultLogo}
            alt={churchInfo?.name || 'MY EDEN X'}
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-white font-medium truncate flex-1">
            {churchInfo?.name || 'MY EDEN X'}
          </span>
          {/* Cloche notifications membre */}
          <NavLink
            to="/member/notifications"
            className="relative text-gray-300 hover:text-white p-1"
          >
            <MdNotifications size={22} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </NavLink>
          {/* Photo profil mobile → page profil */}
          <button
            onClick={() => navigate('/member/profile')}
            className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none flex-shrink-0"
            title={t('my_profile') || 'Mon Profil'}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-green-500">
              {memberProfile?.profile_photo_url ? (
                <img
                  src={memberProfile.profile_photo_url}
                  alt={memberProfile?.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold">
                  {memberProfile?.full_name?.charAt(0)?.toUpperCase() || <MdPerson size={14} />}
                </div>
              )}
            </div>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 text-white">
          <Outlet context={{ memberInfo, churchInfo, memberProfile, setMemberProfile }} />
        </main>
      </div>
    </div>
  );
}

export default MemberLayout;
