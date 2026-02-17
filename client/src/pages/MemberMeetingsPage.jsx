import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MdGroups, MdAccessTime, MdLocationOn, MdCheckCircle,
  MdSchedule, MdCancel, MdPlayArrow, MdDescription
} from 'react-icons/md';

function MemberMeetingsPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await api.member.getMeetings();
      setMeetings(data);
    } catch (err) {
      console.error('Error fetching meetings:', err);
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

  const getAttendanceBadge = (status) => {
    const statusConfig = {
      invited: { color: 'bg-gray-500', label: t('meetings.attendance_invited') },
      confirmed: { color: 'bg-blue-500', label: t('meetings.attendance_confirmed') },
      present: { color: 'bg-green-500', label: t('meetings.attendance_present') },
      absent: { color: 'bg-red-500', label: t('meetings.attendance_absent') },
      excused: { color: 'bg-yellow-500', label: t('meetings.attendance_excused') }
    };

    const config = statusConfig[status] || statusConfig.invited;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const now = new Date();
  const filteredMeetings = meetings.filter(meeting => {
    if (!meeting.meeting_date) return filter === 'all';
    const meetingDate = new Date(meeting.meeting_date);
    if (isNaN(meetingDate.getTime())) return filter === 'all';
    if (filter === 'upcoming') {
      return meetingDate >= now && meeting.status !== 'cancelled';
    } else if (filter === 'past') {
      return meetingDate < now || meeting.status === 'completed';
    }
    return true;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MdGroups size={28} className="text-indigo-400" />
          {t('meetings.title')}
        </h1>
        <p className="text-gray-400 mt-1">{t('meetings.subtitle')}</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'upcoming'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {t('upcoming')}
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'past'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {t('past')}
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {t('all')}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Liste des réunions */}
      {filteredMeetings.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdGroups className="mx-auto text-gray-600 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">
            {filter === 'upcoming' ? t('no_upcoming_events') : t('meetings.no_meetings')}
          </h3>
          <p className="text-gray-400">{t('meetings.no_meetings_hint')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMeetings.map((meeting) => {
            const title = currentLang === 'fr' ? meeting.title_fr : (meeting.title_en || meeting.title_fr);
            const agenda = currentLang === 'fr' ? meeting.agenda_fr : (meeting.agenda_en || meeting.agenda_fr);
            const meetingDate = meeting.meeting_date ? new Date(meeting.meeting_date) : null;
            const isValidDate = meetingDate && !isNaN(meetingDate.getTime());

            return (
              <div
                key={meeting.id}
                className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-indigo-500 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{title}</h3>
                      {getStatusBadge(meeting.status)}
                      {meeting.attendance_status && getAttendanceBadge(meeting.attendance_status)}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <MdAccessTime size={16} />
                        {isValidDate ? meetingDate.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MdLocationOn size={16} />
                          {meeting.location}
                        </span>
                      )}
                    </div>

                    {agenda && (
                      <div className="bg-gray-900 rounded-lg p-3 mt-2">
                        <div className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                          <MdDescription size={16} />
                          {t('meetings.agenda')}
                        </div>
                        <p className="text-gray-400 text-sm whitespace-pre-line line-clamp-3">
                          {agenda}
                        </p>
                      </div>
                    )}

                    {meeting.role && meeting.role !== 'participant' && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                          {meeting.role === 'organizer' ? t('meetings.role_organizer') : t('meetings.role_secretary')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MemberMeetingsPage;
