import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext, Link } from 'react-router-dom';
import { api } from '../api/api';
import {
  MdEvent, MdBadge, MdNotifications, MdAnnouncement,
  MdArrowForward, MdPerson
} from 'react-icons/md';

function MemberDashboardPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { memberInfo, churchInfo } = useOutletContext();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api.member.getDashboard();
        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="text-gray-300">{t('loading')}...</div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400">{error}</div>
    );
  }

  const stats = [
    {
      label: t('my_events'),
      value: dashboardData?.upcoming_events_count || 0,
      icon: MdEvent,
      color: 'from-indigo-600 to-purple-600',
      link: '/member/events'
    },
    {
      label: t('my_roles'),
      value: dashboardData?.roles_count || 0,
      icon: MdBadge,
      color: 'from-green-600 to-emerald-600',
      link: '/member/roles'
    },
    {
      label: t('notifications'),
      value: dashboardData?.unread_notifications || 0,
      icon: MdNotifications,
      color: 'from-amber-600 to-orange-600',
      link: '/member/notifications'
    },
    {
      label: t('announcements'),
      value: dashboardData?.announcements_count || 0,
      icon: MdAnnouncement,
      color: 'from-pink-600 to-rose-600',
      link: '/member/announcements'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <MdPerson className="text-3xl text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {t('welcome_member')}, {dashboardData?.member?.full_name || 'Membre'}!
            </h1>
            <p className="text-indigo-100">
              {churchInfo?.name || 'MY EDEN X'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                <stat.icon className="text-xl text-white" />
              </div>
              <MdArrowForward className="text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent Announcements */}
      {Array.isArray(dashboardData?.recent_announcements) && dashboardData.recent_announcements.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MdAnnouncement className="text-amber-400" />
              {t('announcements')}
            </h2>
            <Link
              to="/member/announcements"
              className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {t('view_all')}
              <MdArrowForward />
            </Link>
          </div>
          <div className="divide-y divide-gray-700">
            {dashboardData.recent_announcements.slice(0, 3).map((announcement) => (
              <div key={announcement.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                <h3 className="font-medium text-white mb-1">
                  {lang === 'fr' ? announcement.title_fr : announcement.title_en}
                </h3>
                <p className="text-sm text-gray-400 line-clamp-2">
                  {lang === 'fr' ? announcement.content_fr : announcement.content_en}
                </p>
                {announcement.published_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(announcement.published_at).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-US'
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {Array.isArray(dashboardData?.upcoming_events) && dashboardData.upcoming_events.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MdEvent className="text-indigo-400" />
              {t('upcoming_events')}
            </h2>
            <Link
              to="/member/events"
              className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {t('view_all')}
              <MdArrowForward />
            </Link>
          </div>
          <div className="divide-y divide-gray-700">
            {dashboardData.upcoming_events.slice(0, 3).map((event) => (
              <div key={event.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-4">
                  {event.background_image_url && (
                    <img
                      src={event.background_image_url}
                      alt={lang === 'fr' ? event.name_fr : event.name_en}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">
                      {lang === 'fr' ? event.name_fr : event.name_en}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {new Date(event.start_datetime).toLocaleDateString(
                        lang === 'fr' ? 'fr-FR' : 'en-US',
                        { weekday: 'long', day: 'numeric', month: 'long' }
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Roles */}
      {Array.isArray(dashboardData?.roles) && dashboardData.roles.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MdBadge className="text-green-400" />
              {t('my_roles')}
            </h2>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {dashboardData.roles.map((role) => (
              <span
                key={role.id}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: role.color || '#6366f1' }}
              >
                {lang === 'fr' ? role.name_fr : role.name_en}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberDashboardPage;
