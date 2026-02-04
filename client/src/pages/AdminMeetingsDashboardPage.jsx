import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import {
  MdGroups, MdEvent, MdSchedule, MdCheckCircle, MdPlayArrow,
  MdCancel, MdAdd, MdTrendingUp, MdPeople, MdAccessTime
} from 'react-icons/md';

function AdminMeetingsDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language;

  const [stats, setStats] = useState({
    total: 0,
    planned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0
  });
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const meetings = await api.admin.getMeetings();

      // Calculer les statistiques
      const statsData = {
        total: meetings.length,
        planned: meetings.filter(m => m.status === 'planned').length,
        in_progress: meetings.filter(m => m.status === 'in_progress').length,
        completed: meetings.filter(m => m.status === 'completed').length,
        cancelled: meetings.filter(m => m.status === 'cancelled').length
      };
      setStats(statsData);

      // Réunions récentes (5 dernières terminées)
      const recent = meetings
        .filter(m => m.status === 'completed')
        .sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date))
        .slice(0, 5);
      setRecentMeetings(recent);

      // Réunions à venir
      const now = new Date();
      const upcoming = meetings
        .filter(m => m.status === 'planned' && new Date(m.meeting_date) >= now)
        .sort((a, b) => new Date(a.meeting_date) - new Date(b.meeting_date))
        .slice(0, 5);
      setUpcomingMeetings(upcoming);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      planned: { color: 'bg-blue-500', icon: MdSchedule, label: t('meetings.status_planned') },
      in_progress: { color: 'bg-yellow-500', icon: MdPlayArrow, label: t('meetings.status_in_progress') },
      completed: { color: 'bg-green-500', icon: MdCheckCircle, label: t('meetings.status_completed') },
      cancelled: { color: 'bg-red-500', icon: MdCancel, label: t('meetings.status_cancelled') }
    };

    const config = statusConfig[status] || statusConfig.planned;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">{t('loading')}...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MdGroups size={28} className="text-amber-400" />
            {t('meetings.dashboard_title') || 'Dashboard Réunions'}
          </h1>
          <p className="text-gray-400 mt-1">{t('meetings.dashboard_subtitle') || 'Vue d\'ensemble des réunions de votre église'}</p>
        </div>
        <button
          onClick={() => navigate('/admin/meetings')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all"
        >
          <MdAdd size={20} />
          {t('meetings.create')}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <MdEvent className="text-white/80" size={24} />
            <span className="text-2xl font-bold text-white">{stats.total}</span>
          </div>
          <p className="text-indigo-200 text-sm mt-2">{t('meetings.total') || 'Total'}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <MdSchedule className="text-white/80" size={24} />
            <span className="text-2xl font-bold text-white">{stats.planned}</span>
          </div>
          <p className="text-blue-200 text-sm mt-2">{t('meetings.status_planned')}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <MdPlayArrow className="text-white/80" size={24} />
            <span className="text-2xl font-bold text-white">{stats.in_progress}</span>
          </div>
          <p className="text-yellow-200 text-sm mt-2">{t('meetings.status_in_progress')}</p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <MdCheckCircle className="text-white/80" size={24} />
            <span className="text-2xl font-bold text-white">{stats.completed}</span>
          </div>
          <p className="text-green-200 text-sm mt-2">{t('meetings.status_completed')}</p>
        </div>

        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <MdCancel className="text-white/80" size={24} />
            <span className="text-2xl font-bold text-white">{stats.cancelled}</span>
          </div>
          <p className="text-red-200 text-sm mt-2">{t('meetings.status_cancelled')}</p>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Réunions à venir */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MdSchedule className="text-blue-400" />
              {t('meetings.upcoming') || 'À venir'}
            </h3>
            <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-sm rounded-full">
              {upcomingMeetings.length}
            </span>
          </div>

          {upcomingMeetings.length === 0 ? (
            <div className="p-8 text-center">
              <MdSchedule className="mx-auto text-gray-600 mb-3" size={48} />
              <p className="text-gray-400">{t('meetings.no_upcoming') || 'Aucune réunion à venir'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {upcomingMeetings.map((meeting) => {
                const title = currentLang === 'fr' ? meeting.title_fr : (meeting.title_en || meeting.title_fr);
                const meetingDate = new Date(meeting.meeting_date);

                return (
                  <div
                    key={meeting.id}
                    onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
                    className="p-4 hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-white font-medium">{title}</h4>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <MdAccessTime size={14} />
                            {meetingDate.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MdPeople size={14} />
                            {meeting.participants_count || 0}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(meeting.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-4 border-t border-gray-700">
            <button
              onClick={() => navigate('/admin/meetings?status=planned')}
              className="w-full py-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {t('view_all') || 'Voir tout'} →
            </button>
          </div>
        </div>

        {/* Réunions récentes */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MdCheckCircle className="text-green-400" />
              {t('meetings.recent') || 'Récentes'}
            </h3>
            <span className="px-2 py-1 bg-green-600/20 text-green-400 text-sm rounded-full">
              {recentMeetings.length}
            </span>
          </div>

          {recentMeetings.length === 0 ? (
            <div className="p-8 text-center">
              <MdCheckCircle className="mx-auto text-gray-600 mb-3" size={48} />
              <p className="text-gray-400">{t('meetings.no_recent') || 'Aucune réunion terminée'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {recentMeetings.map((meeting) => {
                const title = currentLang === 'fr' ? meeting.title_fr : (meeting.title_en || meeting.title_fr);
                const meetingDate = new Date(meeting.meeting_date);

                return (
                  <div
                    key={meeting.id}
                    onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
                    className="p-4 hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-white font-medium">{title}</h4>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <MdAccessTime size={14} />
                            {meetingDate.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MdPeople size={14} />
                            {meeting.participants_count || 0}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(meeting.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-4 border-t border-gray-700">
            <button
              onClick={() => navigate('/admin/meetings?status=completed')}
              className="w-full py-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {t('view_all') || 'Voir tout'} →
            </button>
          </div>
        </div>
      </div>

      {/* Accès rapide */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('quick_access') || 'Accès rapide'}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/admin/meetings')}
            className="p-4 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors text-center"
          >
            <MdEvent className="mx-auto text-amber-400 mb-2" size={32} />
            <p className="text-white text-sm">{t('meetings.all_meetings') || 'Toutes les réunions'}</p>
          </button>

          <button
            onClick={() => navigate('/admin/meetings?status=planned')}
            className="p-4 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors text-center"
          >
            <MdSchedule className="mx-auto text-blue-400 mb-2" size={32} />
            <p className="text-white text-sm">{t('meetings.status_planned')}</p>
          </button>

          <button
            onClick={() => navigate('/admin/meetings?status=in_progress')}
            className="p-4 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors text-center"
          >
            <MdPlayArrow className="mx-auto text-yellow-400 mb-2" size={32} />
            <p className="text-white text-sm">{t('meetings.status_in_progress')}</p>
          </button>

          <button
            onClick={() => navigate('/admin/meetings?status=completed')}
            className="p-4 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors text-center"
          >
            <MdCheckCircle className="mx-auto text-green-400 mb-2" size={32} />
            <p className="text-white text-sm">{t('meetings.status_completed')}</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminMeetingsDashboardPage;
