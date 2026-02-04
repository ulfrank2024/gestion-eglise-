import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { supabase } from '../supabaseClient';
import defaultLogo from '../assets/logo_eden.png';
import {
  MdDashboard, MdPerson, MdEvent, MdBadge, MdNotifications,
  MdAnnouncement, MdLogout, MdMenu, MdClose, MdGroups
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
        setUnreadNotifications(dashboardData.unread_notifications || 0);

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

  const navItems = [
    { path: '/member/dashboard', icon: MdDashboard, label: t('member_dashboard') },
    { path: '/member/profile', icon: MdPerson, label: t('my_profile') },
    { path: '/member/events', icon: MdEvent, label: t('my_events') },
    { path: '/member/meetings', icon: MdGroups, label: t('meetings.title') },
    { path: '/member/roles', icon: MdBadge, label: t('my_roles') },
    {
      path: '/member/notifications',
      icon: MdNotifications,
      label: t('notifications'),
      badge: unreadNotifications > 0 ? unreadNotifications : null
    },
    { path: '/member/announcements', icon: MdAnnouncement, label: t('my_announcements') },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-gray-300 text-lg">{t('loading')}...</div>
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
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-gray-800 border-r border-gray-700
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header with logo */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <img
                src={churchInfo?.logo_url || defaultLogo}
                alt={churchInfo?.name || 'MY EDEN X'}
                className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500"
              />
              <div>
                <h2 className="text-white font-semibold text-sm truncate">
                  {churchInfo?.name || 'MY EDEN X'}
                </h2>
                <p className="text-gray-400 text-xs">{t('member')}</p>
              </div>
            </div>
            {/* Close button mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <MdClose size={24} />
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-gray-800 border-b border-gray-700 p-4 flex items-center gap-4">
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
          <span className="text-white font-medium truncate">
            {churchInfo?.name || 'MY EDEN X'}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 text-white">
          <Outlet context={{ memberInfo, churchInfo }} />
        </main>
      </div>
    </div>
  );
}

export default MemberLayout;
