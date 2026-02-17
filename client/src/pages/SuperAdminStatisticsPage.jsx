import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link } from 'react-router-dom';
import { MdChurch, MdEvent, MdPeople, MdTrendingUp, MdCalendarToday, MdCheckCircle, MdBadge, MdAnnouncement, MdArrowForward } from 'react-icons/md';

const SuperAdminStatisticsPage = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [memberStats, setMemberStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // R\u00e9cup\u00e9rer les stats de la plateforme et les stats des membres en parall\u00e8le
        const [platformData, membersData] = await Promise.all([
          api.superAdmin.getPlatformStatistics(),
          api.superAdmin.getMembersStatistics()
        ]);
        setStats(platformData);
        setMemberStats(membersData);
      } catch (err) {
        setError(t('super_admin_statistics.error_loading'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [t]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400 text-lg">{error}</div>
      </div>
    );
  }

  const statCards = [
    {
      title: t('super_admin_statistics.total_churches'),
      value: stats?.total_churches || 0,
      icon: MdChurch,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
    },
    {
      title: t('super_admin_statistics.total_events'),
      value: stats?.total_events || 0,
      icon: MdEvent,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
    },
    {
      title: t('super_admin_statistics.total_attendees'),
      value: stats?.total_attendees || 0,
      icon: MdPeople,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
    },
    {
      title: t('super_admin_statistics.total_checkins'),
      value: stats?.total_checkins || 0,
      icon: MdCheckCircle,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
    },
  ];

  const memberStatCards = [
    {
      title: t('super_admin_statistics.total_members') || 'Total Membres',
      value: memberStats?.total_members || 0,
      icon: MdPeople,
      color: 'from-sky-500 to-sky-600',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/30',
    },
    {
      title: t('super_admin_statistics.active_members') || 'Membres Actifs',
      value: memberStats?.active_members || 0,
      icon: MdTrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      title: t('super_admin_statistics.total_roles') || 'R\u00f4les Cr\u00e9\u00e9s',
      value: memberStats?.total_roles || 0,
      icon: MdBadge,
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/30',
    },
    {
      title: t('super_admin_statistics.total_announcements') || 'Annonces',
      value: memberStats?.total_announcements || 0,
      icon: MdAnnouncement,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    },
  ];

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t('super_admin_statistics.title')}
        </h1>
        <p className="text-gray-400">
          {t('super_admin_statistics.subtitle')}
        </p>
      </div>

      {/* Stats Cards - \u00c9v\u00e9nements */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <MdEvent className="text-purple-400" />
          {t('super_admin_statistics.events_stats') || 'Statistiques \u00c9v\u00e9nements'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => (
            <div
              key={index}
              className={`${card.bgColor} ${card.borderColor} border rounded-xl p-6 transition-transform hover:scale-105`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${card.color}`}>
                  <card.icon className="text-white text-2xl" />
                </div>
                <MdTrendingUp className="text-green-400 text-xl" />
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">
                {card.title}
              </h3>
              <p className="text-3xl font-bold text-white">
                {card.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards - Membres */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
            <MdPeople className="text-sky-400" />
            {t('super_admin_statistics.members_stats') || 'Statistiques Membres'}
          </h2>
          <Link
            to="/super-admin/members"
            className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            {t('view_details') || 'Voir d\u00e9tails'}
            <MdArrowForward />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {memberStatCards.map((card, index) => (
            <div
              key={index}
              className={`${card.bgColor} ${card.borderColor} border rounded-xl p-6 transition-transform hover:scale-105`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${card.color}`}>
                  <card.icon className="text-white text-2xl" />
                </div>
                <MdTrendingUp className="text-green-400 text-xl" />
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">
                {card.title}
              </h3>
              <p className="text-3xl font-bold text-white">
                {card.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Churches */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <MdChurch className="mr-2 text-indigo-400" />
            {t('super_admin_statistics.top_churches')}
          </h2>
          {stats?.top_churches && stats.top_churches.length > 0 ? (
            <div className="space-y-4">
              {stats.top_churches.map((church, index) => (
                <div
                  key={church.id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="w-8 h-8 flex items-center justify-center bg-indigo-500/20 text-indigo-400 rounded-full font-bold mr-3">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-white font-medium">{church.name}</p>
                      <p className="text-gray-400 text-sm">{church.subdomain}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{church.event_count}</p>
                    <p className="text-gray-400 text-xs">{t('super_admin_statistics.events')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              {t('super_admin_statistics.no_churches_yet')}
            </p>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <MdCalendarToday className="mr-2 text-purple-400" />
            {t('super_admin_statistics.recent_events')}
          </h2>
          {stats?.recent_events && stats.recent_events.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_events.map((event) => (
                <div
                  key={event.id}
                  className="p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-medium">{event.name_fr || event.name_en}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(event.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm">{event.church_name}</p>
                    <div className="flex items-center text-emerald-400 text-sm">
                      <MdPeople className="mr-1" />
                      {event.attendee_count || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              {t('super_admin_statistics.no_events_yet')}
            </p>
          )}
        </div>
      </div>

      {/* Members Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Churches by Members */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <MdPeople className="mr-2 text-sky-400" />
            {t('super_admin_statistics.top_churches_by_members') || 'Top \u00c9glises par Membres'}
          </h2>
          {memberStats?.top_churches && memberStats.top_churches.length > 0 ? (
            <div className="space-y-4">
              {memberStats.top_churches.map((church, index) => (
                <Link
                  key={church.id}
                  to={`/super-admin/churches/${church.id}/members`}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex items-center">
                    <span className="w-8 h-8 flex items-center justify-center bg-sky-500/20 text-sky-400 rounded-full font-bold mr-3">
                      {index + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      {church.logo_url ? (
                        <img
                          src={church.logo_url}
                          alt={church.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                          {church.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{church.name}</p>
                        <p className="text-gray-400 text-sm">{church.location}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-white font-bold">{church.member_count}</p>
                      <p className="text-gray-400 text-xs">{t('members') || 'membres'}</p>
                    </div>
                    <MdArrowForward className="text-gray-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              {t('super_admin_statistics.no_members_yet') || 'Aucun membre inscrit'}
            </p>
          )}
        </div>

        {/* Recent Members */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <MdCalendarToday className="mr-2 text-green-400" />
            {t('super_admin_statistics.recent_members') || 'Membres R\u00e9cents'}
          </h2>
          {memberStats?.recent_members && memberStats.recent_members.length > 0 ? (
            <div className="space-y-4">
              {memberStats.recent_members.map((member) => (
                <div
                  key={member.id}
                  className="p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {member.profile_photo_url ? (
                        <img
                          src={member.profile_photo_url}
                          alt={member.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-medium">
                          {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{member.full_name}</p>
                        <p className="text-gray-400 text-sm">{member.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-300 text-sm">{member.church_name}</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              {t('super_admin_statistics.no_members_yet') || 'Aucun membre inscrit'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminStatisticsPage;
