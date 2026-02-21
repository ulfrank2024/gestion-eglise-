import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { supabase } from '../supabaseClient';
import defaultLogo from '../assets/logo_eden.png';
import LoadingSpinner from '../components/LoadingSpinner';
import { setAppBadge, clearAppBadge } from '../utils/pwaBadge';
import {
  MdDashboard, MdPerson, MdEvent, MdBadge, MdNotifications, MdNotificationsNone,
  MdAnnouncement, MdLogout, MdMenu, MdClose, MdGroups, MdMusicNote,
  MdMarkEmailRead, MdOpenInNew
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

  // Notification FAB state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);
  const notifPanelRef = useRef(null);

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

  // Fermer le panel si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInsideBell = notifRef.current && notifRef.current.contains(e.target);
      const isInsidePanel = notifPanelRef.current && notifPanelRef.current.contains(e.target);
      if (!isInsideBell && !isInsidePanel) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const handleOpenNotifications = async () => {
    if (!notifOpen) {
      setNotifLoading(true);
      setNotifOpen(true);
      try {
        const data = await api.member.getNotifications();
        setNotifications(Array.isArray(data) ? data : (data?.notifications || []));
      } catch {
        setNotifications([]);
      } finally {
        setNotifLoading(false);
      }
    } else {
      setNotifOpen(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.member.markNotificationRead(id);
      setUnreadNotifications(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* silencieux */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.member.markAllNotificationsRead();
      setUnreadNotifications(0);
      clearAppBadge();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silencieux */ }
  };

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
              </NavLink>
            ))}

            {/* Notifications — lien vers la page complète */}
            <NavLink
              to="/member/notifications"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <div className="relative">
                {unreadNotifications > 0
                  ? <MdNotifications size={20} />
                  : <MdNotificationsNone size={20} />
                }
              </div>
              <span>{t('notifications')}</span>
              {unreadNotifications > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </NavLink>
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

      {/* Bouton flottant notifications membre — fixe bas-droite */}
      <div ref={notifRef} className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleOpenNotifications}
          className="relative w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          title={t('notifications') || 'Notifications'}
        >
          <span className={unreadNotifications > 0 ? 'bell-ring' : ''}>
            {unreadNotifications > 0
              ? <MdNotifications size={22} />
              : <MdNotificationsNone size={22} />
            }
          </span>
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        {notifOpen && (
          <MemberNotificationPanel
            notifications={notifications}
            loading={notifLoading}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onClose={() => setNotifOpen(false)}
            t={t}
            navigate={navigate}
            panelRef={notifPanelRef}
          />
        )}
      </div>
    </div>
  );
}

// Panneau de notifications membre
function MemberNotificationPanel({ notifications, loading, onMarkRead, onMarkAllRead, onClose, t, navigate, panelRef }) {
  const lang = localStorage.getItem('i18nextLng') || 'fr';

  const getTitle = (n) => lang === 'fr' ? n.title_fr : (n.title_en || n.title_fr);
  const getMessage = (n) => lang === 'fr' ? n.message_fr : (n.message_en || n.message_fr);

  const typeColors = {
    event: 'bg-indigo-500',
    meeting: 'bg-blue-500',
    role: 'bg-purple-500',
    announcement: 'bg-amber-500',
    choir: 'bg-pink-500',
    info: 'bg-gray-500',
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div ref={panelRef} className="fixed bottom-20 right-4 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-[100] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <MdNotifications size={18} />
          {t('notifications') || 'Notifications'}
        </h3>
        <button
          onClick={onMarkAllRead}
          className="text-indigo-200 hover:text-white text-xs flex items-center gap-1 transition-colors"
          title={t('mark_all_read') || 'Tout marquer comme lu'}
        >
          <MdMarkEmailRead size={16} />
        </button>
      </div>

      {/* Liste */}
      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            <MdNotificationsNone size={32} className="mx-auto mb-2 opacity-50" />
            <p>{t('no_notifications') || 'Aucune notification'}</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.is_read) onMarkRead(n.id);
                if (n.link) { navigate(n.link); onClose(); }
              }}
              className={`flex gap-3 px-4 py-3 border-b border-gray-700 cursor-pointer transition-colors ${
                n.is_read ? 'hover:bg-gray-750' : 'bg-gray-700/50 hover:bg-gray-700'
              }`}
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeColors[n.type] || typeColors.info}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${n.is_read ? 'text-gray-400' : 'text-white'}`}>
                  {getTitle(n)}
                </p>
                {getMessage(n) && (
                  <p className="text-xs text-gray-400 truncate">{getMessage(n)}</p>
                )}
                <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <div className="w-2 h-2 bg-indigo-400 rounded-full mt-1.5 shrink-0" />
              )}
              {n.link && <MdOpenInNew size={14} className="text-gray-500 mt-1 shrink-0" />}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-700">
        <button
          onClick={() => { navigate('/member/notifications'); onClose(); }}
          className="w-full text-center text-indigo-400 hover:text-indigo-300 text-xs py-1 transition-colors"
        >
          {t('view_all_notifications') || 'Voir toutes les notifications'}
        </button>
      </div>
    </div>
  );
}

export default MemberLayout;
