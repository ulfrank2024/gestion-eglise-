import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import {
  MdMusicNote,
  MdPeople,
  MdCalendarMonth,
  MdLibraryMusic,
  MdArrowForward,
  MdStar,
  MdPerson,
  MdCategory
} from 'react-icons/md';

const AdminChoirDashboardPage = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statistics, setStatistics] = useState(null);
  const [recentPlannings, setRecentPlannings] = useState([]);
  const [topChoristers, setTopChoristers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Récupérer les statistiques
        const statsData = await api.admin.getChoirStatistics();
        setStatistics(statsData);

        // Récupérer les plannings récents (3 prochains)
        const planningsData = await api.admin.getChoirPlannings({ upcoming: true, limit: 3 });
        setRecentPlannings(planningsData);

        // Récupérer les choristes leads (top performers)
        const membersData = await api.admin.getChoirMembers({ is_lead: true, limit: 5 });
        setTopChoristers(membersData);

      } catch (err) {
        console.error('Error fetching choir data:', err);
        setError(t('choir.error_loading'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      <div className="p-6">
        <div className="bg-red-900/30 border border-red-700 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: t('choir.total_members'),
      value: statistics?.total_members || 0,
      icon: MdPeople,
      color: 'from-indigo-500 to-purple-600',
      link: '/admin/choir/members'
    },
    {
      title: t('choir.total_songs'),
      value: statistics?.total_songs || 0,
      icon: MdLibraryMusic,
      color: 'from-emerald-500 to-teal-600',
      link: '/admin/choir/songs'
    },
    {
      title: t('choir.upcoming_events'),
      value: statistics?.upcoming_plannings || 0,
      icon: MdCalendarMonth,
      color: 'from-amber-500 to-orange-600',
      link: '/admin/choir/planning'
    },
    {
      title: t('choir.lead_singers'),
      value: statistics?.lead_singers || 0,
      icon: MdStar,
      color: 'from-pink-500 to-rose-600',
      link: '/admin/choir/members?filter=lead'
    }
  ];

  const getVoiceTypeBadge = (voiceType) => {
    const colors = {
      soprano: 'bg-pink-500/20 text-pink-400',
      alto: 'bg-purple-500/20 text-purple-400',
      tenor: 'bg-blue-500/20 text-blue-400',
      basse: 'bg-emerald-500/20 text-emerald-400',
      autre: 'bg-gray-500/20 text-gray-400'
    };
    return colors[voiceType] || colors.autre;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
          <MdMusicNote className="text-indigo-400" />
          {t('choir.dashboard_title')}
        </h1>
        <p className="text-gray-400 mt-1">{t('choir.dashboard_subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.title}</p>
                <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
              </div>
              <div className={`p-4 rounded-xl bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="text-white text-2xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-indigo-400 text-sm group-hover:text-indigo-300">
              {t('view_details')}
              <MdArrowForward className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Plannings */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <MdCalendarMonth className="text-amber-400" />
              {t('choir.upcoming_plannings')}
            </h2>
            <Link
              to="/admin/choir/planning"
              className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center"
            >
              {t('view_all')}
              <MdArrowForward className="ml-1" />
            </Link>
          </div>

          {recentPlannings.length > 0 ? (
            <div className="space-y-3">
              {recentPlannings.map((planning) => (
                <Link
                  key={planning.id}
                  to={`/admin/choir/planning/${planning.id}`}
                  className="block p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">
                        {i18n.language === 'fr' ? planning.event_name_fr : planning.event_name_en}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {new Date(planning.event_date).toLocaleDateString(i18n.language, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                        {planning.event_time && ` - ${planning.event_time.slice(0, 5)}`}
                      </p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      planning.event_type === 'culte' ? 'bg-indigo-500/20 text-indigo-400' :
                      planning.event_type === 'repetition' ? 'bg-amber-500/20 text-amber-400' :
                      planning.event_type === 'concert' ? 'bg-pink-500/20 text-pink-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {t(`choir.event_type_${planning.event_type}`)}
                    </span>
                  </div>
                  {planning.songs_count > 0 && (
                    <div className="mt-2 flex items-center text-sm text-gray-400">
                      <MdMusicNote className="mr-1" />
                      {planning.songs_count} {t('choir.songs')}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <MdCalendarMonth className="text-4xl mx-auto mb-2 opacity-50" />
              <p>{t('choir.no_upcoming_plannings')}</p>
              <Link
                to="/admin/choir/planning/new"
                className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block"
              >
                {t('choir.create_planning')}
              </Link>
            </div>
          )}
        </div>

        {/* Lead Singers */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <MdStar className="text-amber-400" />
              {t('choir.lead_choristers')}
            </h2>
            <Link
              to="/admin/choir/members"
              className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center"
            >
              {t('view_all')}
              <MdArrowForward className="ml-1" />
            </Link>
          </div>

          {topChoristers.length > 0 ? (
            <div className="space-y-3">
              {topChoristers.map((chorister) => (
                <div
                  key={chorister.id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {chorister.member?.profile_photo_url ? (
                      <img
                        src={chorister.member.profile_photo_url}
                        alt={chorister.member.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <MdPerson className="text-indigo-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white">{chorister.member?.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getVoiceTypeBadge(chorister.voice_type)}`}>
                          {t(`choir.voice_${chorister.voice_type}`)}
                        </span>
                        {chorister.is_lead && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                            <MdStar className="inline mr-1" />
                            Lead
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-400">
                    <p>{chorister.repertoire_count || 0}</p>
                    <p className="text-xs">{t('choir.songs')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <MdPeople className="text-4xl mx-auto mb-2 opacity-50" />
              <p>{t('choir.no_lead_choristers')}</p>
              <Link
                to="/admin/choir/members"
                className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block"
              >
                {t('choir.add_chorister')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/choir/members/add"
          className="flex items-center gap-3 p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-indigo-500 transition-colors group"
        >
          <div className="p-3 rounded-lg bg-indigo-500/20 group-hover:bg-indigo-500/30 transition-colors">
            <MdPeople className="text-indigo-400 text-xl" />
          </div>
          <div>
            <p className="font-medium text-white">{t('choir.add_chorister')}</p>
            <p className="text-sm text-gray-400">{t('choir.add_chorister_desc')}</p>
          </div>
        </Link>

        <Link
          to="/admin/choir/songs/add"
          className="flex items-center gap-3 p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-emerald-500 transition-colors group"
        >
          <div className="p-3 rounded-lg bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
            <MdLibraryMusic className="text-emerald-400 text-xl" />
          </div>
          <div>
            <p className="font-medium text-white">{t('choir.add_song')}</p>
            <p className="text-sm text-gray-400">{t('choir.add_song_desc')}</p>
          </div>
        </Link>

        <Link
          to="/admin/choir/planning/new"
          className="flex items-center gap-3 p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-amber-500 transition-colors group"
        >
          <div className="p-3 rounded-lg bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
            <MdCalendarMonth className="text-amber-400 text-xl" />
          </div>
          <div>
            <p className="font-medium text-white">{t('choir.create_planning')}</p>
            <p className="text-sm text-gray-400">{t('choir.create_planning_desc')}</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AdminChoirDashboardPage;
