import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  MdMusicNote, MdLibraryMusic, MdCalendarMonth, MdStar,
  MdArrowForward, MdGroups,
} from 'react-icons/md';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminMyChoirPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.admin.getMyChoirStatus();
        setData(res);
      } catch (err) {
        console.error('Error fetching my choir status:', err);
        setError(err.response?.data?.error || t('error_loading_data'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  // Pas encore choriste
  if (!data?.is_choir_member) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MdMusicNote size={28} className="text-indigo-400" />
            {t('my_choir') || 'Ma Chorale'}
          </h1>
          <p className="text-gray-400 mt-1 text-sm">{t('my_choir_subtitle') || 'Votre espace choriste personnel'}</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdMusicNote className="mx-auto text-gray-600 mb-4" size={56} />
          <h2 className="text-xl font-semibold text-gray-300 mb-2">
            {t('member_choir.not_member_title') || 'Vous n\'êtes pas dans la chorale'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {t('member_choir.not_member_description') || 'Demandez à l\'admin principal de vous ajouter comme choriste.'}
          </p>
          <Link
            to="/admin/choir"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
          >
            <MdGroups size={16} />
            {t('choir.manage_choir') || 'Gérer la Chorale'}
          </Link>
        </div>
      </div>
    );
  }

  const { choir_member, stats, upcoming_plannings, recent_songs } = data;

  const voiceTypeLabels = {
    soprano: t('choir.voice_soprano') || 'Soprano',
    alto:    t('choir.voice_alto')    || 'Alto',
    tenor:   t('choir.voice_tenor')   || 'Ténor',
    basse:   t('choir.voice_basse')   || 'Basse',
    autre:   t('choir.voice_autre')   || 'Autre',
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MdMusicNote size={28} className="text-indigo-400" />
          {t('my_choir') || 'Ma Chorale'}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">{t('my_choir_subtitle') || 'Votre espace choriste personnel'}</p>
      </div>

      {/* Carte statut choriste */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-full">
            <MdMusicNote className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t('member_choir.dashboard_title') || 'Mon Espace Chorale'}</h2>
            <p className="text-indigo-100 flex items-center gap-2 mt-1">
              {voiceTypeLabels[choir_member.voice_type] || choir_member.voice_type}
              {choir_member.is_lead && (
                <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                  <MdStar className="w-3 h-3" />
                  Lead
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <MdLibraryMusic className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{stats.repertoire_count}</p>
              <p className="text-sm text-gray-400">{t('member_choir.my_repertoire') || 'Mon Répertoire'}</p>
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
              <p className="text-sm text-gray-400">{t('member_choir.upcoming_plannings') || 'Plannings à venir'}</p>
            </div>
          </div>
        </div>

        {choir_member.is_lead && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <MdStar className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100">Lead</p>
                <p className="text-sm text-gray-400">{t('member_choir.lead_count') || 'Rôle Lead'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/admin/choir/songs"
          className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:bg-gray-700 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <MdMusicNote className="w-6 h-6 text-green-400" />
            <span className="text-gray-200">{t('member_choir.browse_songs') || 'Parcourir les chants'}</span>
          </div>
          <MdArrowForward className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors" />
        </Link>

        <Link
          to="/admin/choir/planning"
          className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:bg-gray-700 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <MdCalendarMonth className="w-6 h-6 text-purple-400" />
            <span className="text-gray-200">{t('member_choir.view_planning') || 'Voir le planning'}</span>
          </div>
          <MdArrowForward className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
        </Link>
      </div>

      {/* Prochains plannings */}
      {upcoming_plannings?.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <MdCalendarMonth className="w-5 h-5 text-purple-400" />
            {t('member_choir.upcoming_events') || 'Prochains événements'}
          </h2>
          <div className="space-y-3">
            {upcoming_plannings.map(planning => (
              <Link
                key={planning.id}
                to="/admin/choir/planning"
                className="block bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-200">
                      {lang === 'fr' ? planning.event_name_fr : planning.event_name_en}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {new Date(planning.event_date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
                        weekday: 'long', day: 'numeric', month: 'long',
                      })}
                      {planning.event_time && ` • ${planning.event_time}`}
                    </p>
                  </div>
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                    {t(`choir.event_type_${planning.event_type}`) || planning.event_type}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Répertoire récent (si lead) */}
      {choir_member.is_lead && recent_songs?.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <MdLibraryMusic className="w-5 h-5 text-indigo-400" />
            {t('member_choir.recent_songs') || 'Chants récents dans mon répertoire'}
          </h2>
          <div className="space-y-2">
            {recent_songs.map(item => (
              <div key={item.id} className="bg-gray-700/50 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-200">{item.choir_songs_v2?.title}</p>
                  <p className="text-sm text-gray-400">{item.choir_songs_v2?.author}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  item.proficiency_level === 'expert'      ? 'bg-green-500/20 text-green-400'  :
                  item.proficiency_level === 'comfortable' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {t(`member_choir.proficiency_${item.proficiency_level}`) || item.proficiency_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
