import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MdGroups, MdAccessTime, MdLocationOn, MdNotes,
  MdExpandMore, MdExpandLess, MdCheckCircle, MdSchedule,
  MdPlayArrow, MdCancel, MdFlashOn, MdCalendarToday
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
      planned:     { color: 'bg-blue-600',  icon: MdSchedule,    label: t('meetings.status_planned') },
      in_progress: { color: 'bg-yellow-600', icon: MdPlayArrow,   label: t('meetings.status_in_progress') },
      completed:   { color: 'bg-green-600',  icon: MdCheckCircle, label: t('meetings.status_completed') },
      cancelled:   { color: 'bg-red-600',    icon: MdCancel,      label: t('meetings.status_cancelled') },
      closed:      { color: 'bg-teal-600',   icon: MdFlashOn,     label: t('meetings.status_closed') || 'Compte-rendu' },
    };
    const c = cfg[status] || cfg.planned;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${c.color}`}>
        <Icon size={12} /> {c.label}
      </span>
    );
  };

  const now = new Date();
  const filteredMeetings = meetings.filter(m => {
    if (!m.meeting_date) return filter === 'all';
    const d = new Date(m.meeting_date);
    if (isNaN(d.getTime())) return filter === 'all';
    if (filter === 'upcoming' && (d < now || m.status === 'cancelled' || m.status === 'closed')) return false;
    if (filter === 'past' && d >= now && m.status !== 'completed' && m.status !== 'closed') return false;
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
          {t('meetings.my_meetings') || 'Mes Réunions'}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          {t('meetings.my_meetings_subtitle') || 'Réunions auxquelles vous participez ou que vous avez créées'}
        </p>
      </div>

      {/* Filtres statut + dates */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {[
            { key: 'all',      label: t('all') || 'Toutes' },
            { key: 'upcoming', label: t('upcoming') || 'À venir' },
            { key: 'past',     label: t('past') || 'Passées' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MdCalendarToday className="text-gray-400" size={18} />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            title="Date de début"
          />
          <span className="text-gray-400 text-sm">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            title="Date de fin"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-700 rounded-lg"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">{error}</div>
      )}

      <p className="text-gray-500 text-sm">{filteredMeetings.length} réunion(s)</p>

      {filteredMeetings.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdGroups className="mx-auto text-gray-600 mb-4" size={64} />
          <p className="text-gray-400">{t('meetings.no_meetings') || 'Aucune réunion trouvée'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMeetings.map(meeting => {
            const title = currentLang === 'fr' ? meeting.title_fr : (meeting.title_en || meeting.title_fr);
            const notes = currentLang === 'fr' ? meeting.notes_fr : (meeting.notes_en || meeting.notes_fr);
            const agenda = currentLang === 'fr' ? meeting.agenda_fr : (meeting.agenda_en || meeting.agenda_fr);
            const d = meeting.meeting_date ? new Date(meeting.meeting_date) : null;
            const isValid = d && !isNaN(d.getTime());
            const isExpanded = expandedId === meeting.id;
            const hasNotes = notes && notes.trim().length > 0;

            return (
              <div key={meeting.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {/* En-tête cliquable */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                  className="w-full text-left p-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{title}</h3>
                        {getStatusBadge(meeting.status)}
                        {hasNotes && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-700/30 text-green-400 text-xs rounded-full border border-green-700/50">
                            <MdNotes size={12} />
                            {t('meetings.notes') || 'Compte-rendu'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <MdAccessTime size={14} />
                          {isValid ? d.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          }) : '-'}
                        </span>
                        {meeting.location && (
                          <span className="flex items-center gap-1">
                            <MdLocationOn size={14} />
                            {meeting.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-400 flex-shrink-0 mt-1">
                      {isExpanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
                    </div>
                  </div>
                </button>

                {/* Contenu expandable */}
                {isExpanded && (
                  <div className="border-t border-gray-700 p-4 space-y-4">
                    {agenda && (
                      <div>
                        <h4 className="text-amber-400 text-sm font-semibold mb-2 flex items-center gap-2">
                          <MdNotes size={16} />
                          {t('meetings.agenda') || 'Ordre du jour'}
                        </h4>
                        <div className="bg-gray-900 rounded-lg p-3 text-gray-300 text-sm whitespace-pre-line">
                          {agenda}
                        </div>
                      </div>
                    )}

                    {hasNotes ? (
                      <div>
                        <h4 className="text-green-400 text-sm font-semibold mb-2 flex items-center gap-2">
                          <MdCheckCircle size={16} />
                          {t('meetings.notes') || 'Compte-rendu'}
                        </h4>
                        <div className="bg-gray-900 rounded-lg p-3 text-gray-300 text-sm whitespace-pre-line">
                          {notes}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic">
                        {t('meetings.no_notes') || 'Aucun compte-rendu rédigé'}
                      </p>
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
