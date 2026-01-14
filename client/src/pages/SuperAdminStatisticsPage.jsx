import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useTranslation } from 'react-i18next';
import { MdChurch, MdEvent, MdPeople, MdTrendingUp, MdCalendarToday, MdCheckCircle } from 'react-icons/md';

const SuperAdminStatisticsPage = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.superAdmin.getPlatformStatistics();
        setStats(data);
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-300 text-lg">{t('loading')}...</div>
      </div>
    );
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    </div>
  );
};

export default SuperAdminStatisticsPage;
