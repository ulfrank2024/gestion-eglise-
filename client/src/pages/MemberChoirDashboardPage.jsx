import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MdMusicNote, MdLibraryMusic, MdCalendarMonth, MdPerson, MdStar, MdArrowForward } from 'react-icons/md';
import { api } from '../api/api';

export default function MemberChoirDashboardPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.member.getChoirDashboard();
        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching choir dashboard:', err);
        setError(err.response?.data?.message || t('error_loading_data'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (!dashboardData?.is_choir_member) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
        <MdMusicNote className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-200 mb-2">
          {t('member_choir.not_member_title')}
        </h2>
        <p className="text-gray-400">
          {t('member_choir.not_member_description')}
        </p>
      </div>
    );
  }

  const { choir_member, stats, upcoming_plannings, recent_songs } = dashboardData;

  const voiceTypeLabels = {
    soprano: t('choir.soprano'),
    alto: t('choir.alto'),
    tenor: t('choir.tenor'),
    basse: t('choir.basse'),
    autre: t('choir.other')
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-full">
            <MdMusicNote className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('member_choir.dashboard_title')}</h1>
            <p className="text-indigo-100">
              {voiceTypeLabels[choir_member.voice_type] || choir_member.voice_type}
              {choir_member.is_lead && (
                <span className="ml-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                  <MdStar className="inline w-3 h-3 mr-1" />
                  Lead
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <MdLibraryMusic className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{stats.repertoire_count}</p>
              <p className="text-sm text-gray-400">{t('member_choir.my_repertoire')}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <MdCalendarMonth className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{stats.upcoming_plannings}</p>
              <p className="text-sm text-gray-400">{t('member_choir.upcoming_plannings')}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 p-2 rounded-lg">
              <MdStar className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{stats.lead_count}</p>
              <p className="text-sm text-gray-400">{t('member_choir.lead_count')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/member/choir/repertoire"
          className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:bg-gray-700 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <MdLibraryMusic className="w-6 h-6 text-indigo-400" />
            <span className="text-gray-200">{t('member_choir.view_repertoire')}</span>
          </div>
          <MdArrowForward className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 transition-colors" />
        </Link>

        <Link
          to="/member/choir/songs"
          className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:bg-gray-700 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <MdMusicNote className="w-6 h-6 text-green-400" />
            <span className="text-gray-200">{t('member_choir.browse_songs')}</span>
          </div>
          <MdArrowForward className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors" />
        </Link>

        <Link
          to="/member/choir/planning"
          className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:bg-gray-700 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <MdCalendarMonth className="w-6 h-6 text-purple-400" />
            <span className="text-gray-200">{t('member_choir.view_planning')}</span>
          </div>
          <MdArrowForward className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
        </Link>
      </div>

      {/* Upcoming Plannings */}
      {upcoming_plannings?.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <MdCalendarMonth className="w-5 h-5 text-purple-400" />
            {t('member_choir.upcoming_events')}
          </h2>
          <div className="space-y-3">
            {upcoming_plannings.map((planning) => (
              <Link
                key={planning.id}
                to={`/member/choir/planning/${planning.id}`}
                className="block bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-200">
                      {lang === 'fr' ? planning.event_name_fr : planning.event_name_en}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {new Date(planning.event_date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                      {planning.event_time && ` • ${planning.event_time}`}
                    </p>
                  </div>
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                    {t(`choir.event_type_${planning.event_type}`)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Songs in Repertoire */}
      {choir_member.is_lead && recent_songs?.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <MdLibraryMusic className="w-5 h-5 text-indigo-400" />
            {t('member_choir.recent_songs')}
          </h2>
          <div className="space-y-2">
            {recent_songs.map((item) => (
              <div
                key={item.id}
                className="bg-gray-700/50 rounded-lg p-3 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-gray-200">{item.choir_songs_v2?.title}</p>
                  <p className="text-sm text-gray-400">{item.choir_songs_v2?.author}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  item.proficiency_level === 'expert' ? 'bg-green-500/20 text-green-400' :
                  item.proficiency_level === 'comfortable' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {t(`member_choir.proficiency_${item.proficiency_level}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
