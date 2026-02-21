import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MdGroups, MdAccessTime, MdLocationOn, MdNotes,
  MdExpandMore, MdExpandLess, MdCheckCircle, MdSchedule,
  MdPlayArrow, MdCancel, MdFlashOn, MdCalendarToday,
  MdPerson, MdAssignment, MdInfo
} from 'react-icons/md';

function AdminMyMeetingsPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getMyMeetings();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching my meetings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const cfg = {
      planned:     { color: 'bg-blue-600',   icon: MdSchedule,    label: t('meetings.status_planned') },
      in_progress: { color: 'bg-yellow-600', icon: MdPlayArrow,   label: t('meetings.status_in_progress') },
      completed:   { color: 'bg-green-600',  icon: MdCheckCircle, label: t('meetings.status_completed') },
      cancelled:   { color: 'bg-red-600',    icon: MdCancel,      label: t('meetings.status_cancelled') },
      closed:      { color: 'bg-teal-600',   icon: MdFlashOn,     label: t('meetings.status_closed') },
    };
    const c = cfg[status] || cfg.planned;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${c.color}`}>
        <Icon size={12} /> {c.label}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const roles = {
      organizer: { color: 'bg-indigo-700 text-indigo-200', label: t('meetings.role_organizer') },
      secretary:  { color: 'bg-purple-700 text-purple-200', label: t('meetings.role_secretary') },
      participant: { color: 'bg-gray-700 text-gray-300',   label: t('meetings.role_participant') },
    };
    const r = roles[role] || roles.participant;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${r.color}`}>
        <MdPerson size={11} /> {r.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const now = new Date();
  const filteredMeetings = meetings.filter(m => {
    if (!m.meeting_date) return filter === 'all';
    const d = new Date(m.meeting_date);
    if (isNaN(d.getTime())) return filter === 'all';
    if (filter === 'upcoming' && (d < now || m.status === 'cancelled' || m.status === 'closed' || m.status === 'completed')) return false;
    if (filter === 'past' && d >= now && m.status !== 'completed' && m.status !== 'closed' && m.status !== 'cancelled') return false;
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      if (d > to) return false;
    }
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MdGroups size={28} className="text-amber-400" />
          {t('meetings.my_meetings')}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          {t('meetings.my_meetings_subtitle')}
        </p>
      </div>

      {/* Filtres statut + dates */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Boutons filtre */}
        <div className="flex gap-2">
          {[
            { key: 'all',      label: t('meetings.filter_all') },
            { key: 'upcoming', label: t('meetings.filter_upcoming') },
            { key: 'past',     label: t('meetings.filter_past') },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Filtre par date */}
        <div className="flex items-center gap-2 flex-wrap">
          <MdCalendarToday className="text-gray-400" size={16} />
          <span className="text-gray-400 text-xs">{t('meetings.date_from')}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-gray-400 text-xs">{t('meetings.date_to')}</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-700 rounded-lg"
            >
              {t('meetings.clear_dates')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">{error}</div>
      )}

      <p className="text-gray-500 text-sm">
        {filteredMeetings.length} {t('meetings.meetings_count')}
      </p>

      {filteredMeetings.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdGroups className="mx-auto text-gray-600 mb-4" size={64} />
          <p className="text-gray-400">{t('meetings.no_meetings_found')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMeetings.map(meeting => {
            const title   = currentLang === 'fr' ? meeting.title_fr : (meeting.title_en || meeting.title_fr);
            const notes   = currentLang === 'fr' ? meeting.notes_fr : (meeting.notes_en || meeting.notes_fr);
            const agenda  = currentLang === 'fr' ? meeting.agenda_fr : (meeting.agenda_en || meeting.agenda_fr);
            const hasNotes  = notes && notes.trim().length > 0;
            const hasAgenda = agenda && agenda.trim().length > 0;
            const isExpanded = expandedId === meeting.id;

            // Trouver le rôle de l'admin dans cette réunion
            const myParticipant = (meeting.meeting_participants_v2 || []).find(p =>
              p.participant_email != null  // participant admin (non-membre)
            );
            const myRole = myParticipant?.role || null;

            return (
              <div key={meeting.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {/* En-tête cliquable */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                  className="w-full text-left p-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Titre + badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-white font-semibold">{title}</h3>
                        {getStatusBadge(meeting.status)}
                        {myRole && getRoleBadge(myRole)}
                        {hasNotes && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-700/30 text-green-400 text-xs rounded-full border border-green-700/50">
                            <MdAssignment size={11} />
                            {t('meetings.notes')}
                          </span>
                        )}
                      </div>

                      {/* Infos date + lieu */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <MdAccessTime size={14} />
                          {formatDate(meeting.meeting_date)}
                        </span>
                        {meeting.location && (
                          <span className="flex items-center gap-1">
                            <MdLocationOn size={14} />
                            {meeting.location}
                          </span>
                        )}
                        {meeting.participants_count > 0 && (
                          <span className="flex items-center gap-1">
                            <MdGroups size={14} />
                            {meeting.participants_count} {t('meetings.participants')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Icône expand */}
                    <div className="text-gray-400 flex-shrink-0 mt-1">
                      {isExpanded ? <MdExpandLess size={22} /> : <MdExpandMore size={22} />}
                    </div>
                  </div>
                </button>

                {/* Contenu expandable */}
                {isExpanded && (
                  <div className="border-t border-gray-700 divide-y divide-gray-700/50">
                    {/* Ordre du jour */}
                    {hasAgenda && (
                      <div className="p-4">
                        <h4 className="text-amber-400 text-sm font-semibold mb-2 flex items-center gap-2">
                          <MdInfo size={16} />
                          {t('meetings.agenda')}
                        </h4>
                        <div className="bg-gray-900 rounded-lg p-3 text-gray-300 text-sm whitespace-pre-line leading-relaxed">
                          {agenda}
                        </div>
                      </div>
                    )}

                    {/* Compte-rendu / Notes */}
                    <div className="p-4">
                      <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${hasNotes ? 'text-green-400' : 'text-gray-500'}`}>
                        <MdNotes size={16} />
                        {t('meetings.notes')}
                      </h4>
                      {hasNotes ? (
                        <div className="bg-gray-900 rounded-lg p-3 text-gray-300 text-sm whitespace-pre-line leading-relaxed">
                          {notes}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm italic">{t('meetings.no_report')}</p>
                      )}
                    </div>

                    {/* Liste participants (compact) */}
                    {meeting.meeting_participants_v2 && meeting.meeting_participants_v2.length > 0 && (
                      <div className="p-4">
                        <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2">
                          <MdGroups size={14} />
                          {t('meetings.participants_section')} ({meeting.meeting_participants_v2.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {meeting.meeting_participants_v2.map(p => {
                            const name = p.members_v2?.full_name || p.participant_name || '—';
                            return (
                              <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded-lg text-xs text-gray-300">
                                <MdPerson size={12} className="text-gray-500" />
                                {name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminMyMeetingsPage;
