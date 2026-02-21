import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MdGroups, MdAccessTime, MdLocationOn, MdNotes,
  MdExpandMore, MdExpandLess, MdCheckCircle, MdSchedule,
  MdPlayArrow, MdCancel, MdFlashOn, MdCalendarToday,
  MdPerson, MdInfo, MdAssignment
} from 'react-icons/md';

function AdminMyMeetingsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchMeetings(); }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getMyMeetings();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Badges ── */
  const getStatusBadge = (status) => {
    const cfg = {
      planned:     { cls: 'bg-blue-600',   Icon: MdSchedule,    label: t('meetings.status_planned') },
      in_progress: { cls: 'bg-yellow-600', Icon: MdPlayArrow,   label: t('meetings.status_in_progress') },
      completed:   { cls: 'bg-green-600',  Icon: MdCheckCircle, label: t('meetings.status_completed') },
      cancelled:   { cls: 'bg-red-600',    Icon: MdCancel,      label: t('meetings.status_cancelled') },
      closed:      { cls: 'bg-teal-600',   Icon: MdFlashOn,     label: t('meetings.status_closed') },
    };
    const c = cfg[status] || cfg.planned;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${c.cls}`}>
        <c.Icon size={12} /> {c.label}
      </span>
    );
  };

  const getAttendanceBadge = (attendance) => {
    const cfg = {
      invited:   { cls: 'bg-gray-700 text-gray-300',      label: t('meetings.attendance_invited') },
      confirmed: { cls: 'bg-cyan-700 text-cyan-200',      label: t('meetings.attendance_confirmed') },
      present:   { cls: 'bg-green-700 text-green-200',    label: t('meetings.attendance_present') },
      absent:    { cls: 'bg-red-700 text-red-200',        label: t('meetings.attendance_absent') },
      excused:   { cls: 'bg-orange-700 text-orange-200',  label: t('meetings.attendance_excused') },
    };
    if (!attendance || !cfg[attendance]) return null;
    const c = cfg[attendance];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>
        <MdCheckCircle size={11} /> {c.label}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const cfg = {
      organizer:   { cls: 'bg-indigo-700 text-indigo-200', label: t('meetings.role_organizer') },
      secretary:   { cls: 'bg-purple-700 text-purple-200', label: t('meetings.role_secretary') },
      participant: { cls: 'bg-gray-700 text-gray-300',     label: t('meetings.role_participant') },
    };
    if (!role || !cfg[role]) return null;
    const c = cfg[role];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>
        <MdPerson size={11} /> {c.label}
      </span>
    );
  };

  /* ── Format date ── */
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  /* ── Filtrage ── */
  const now = new Date();
  const filtered = meetings.filter(m => {
    const d = m.meeting_date ? new Date(m.meeting_date) : null;
    const isUpcoming = d && d >= now && !['completed','closed','cancelled'].includes(m.status);
    const isPast     = !isUpcoming;

    if (filter === 'upcoming' && !isUpcoming) return false;
    if (filter === 'past'     && !isPast)     return false;
    if (dateFrom && d && d < new Date(dateFrom)) return false;
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23,59,59);
      if (d && d > to) return false;
    }
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* ── En-tête ── */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MdGroups size={28} className="text-amber-400" />
          {t('meetings.my_meetings')}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">{t('meetings.my_meetings_subtitle')}</p>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
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
                filter === f.key ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap text-sm">
          <MdCalendarToday className="text-gray-400" size={15} />
          <span className="text-gray-500">{t('meetings.date_from')}</span>
          <input
            type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-gray-500">{t('meetings.date_to')}</span>
          <input
            type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-700 rounded-lg">
              {t('meetings.clear_dates')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">{error}</div>
      )}

      <p className="text-gray-500 text-sm">{filtered.length} {t('meetings.meetings_count')}</p>

      {/* ── Liste ── */}
      {filtered.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdGroups className="mx-auto text-gray-600 mb-4" size={56} />
          <p className="text-gray-400">{t('meetings.no_meetings_found')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(meeting => {
            const title   = lang === 'fr' ? meeting.title_fr : (meeting.title_en || meeting.title_fr);
            const notes   = lang === 'fr' ? meeting.notes_fr : (meeting.notes_en || meeting.notes_fr);
            const agenda  = lang === 'fr' ? meeting.agenda_fr : (meeting.agenda_en || meeting.agenda_fr);
            const hasNotes  = notes  && notes.trim().length  > 0;
            const hasAgenda = agenda && agenda.trim().length > 0;
            const isExpanded = expandedId === meeting.id;

            return (
              <div key={meeting.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">

                {/* ── En-tête cliquable ── */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                  className="w-full text-left p-4 transition-colors hover:bg-gray-700/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Titre + badges statut / attendance / rôle */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-white font-semibold leading-tight">{title}</h3>
                        {getStatusBadge(meeting.status)}
                        {getAttendanceBadge(meeting.my_attendance)}
                        {getRoleBadge(meeting.my_role)}
                        {hasNotes && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-700/30 border border-green-700/50 text-green-400 text-xs rounded-full">
                            <MdAssignment size={11} />
                            {t('meetings.notes')}
                          </span>
                        )}
                      </div>

                      {/* Date / Lieu / Participants */}
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

                    {/* Flèche expand */}
                    <div className="text-gray-400 flex-shrink-0 mt-1 flex items-center gap-1 text-xs">
                      <span className="hidden sm:inline text-gray-500">
                        {isExpanded ? '' : t('meetings.see_details')}
                      </span>
                      {isExpanded ? <MdExpandLess size={22} /> : <MdExpandMore size={22} />}
                    </div>
                  </div>
                </button>

                {/* ── Contenu expandable ── */}
                {isExpanded && (
                  <div className="border-t border-gray-700 divide-y divide-gray-700/40">

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
                      <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
                        hasNotes ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        <MdNotes size={16} />
                        {t('meetings.notes')}
                      </h4>
                      {hasNotes ? (
                        <div className="bg-gray-900 rounded-lg p-3 text-gray-300 text-sm whitespace-pre-line leading-relaxed">
                          {notes}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm italic bg-gray-900/50 rounded-lg px-3 py-2">
                          {t('meetings.no_report')}
                        </p>
                      )}
                    </div>

                    {/* Participants (compact) */}
                    {meeting.meeting_participants_v2 && meeting.meeting_participants_v2.length > 0 && (
                      <div className="p-4">
                        <h4 className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2">
                          <MdGroups size={13} />
                          {t('meetings.participants_section')} ({meeting.meeting_participants_v2.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {meeting.meeting_participants_v2.map(p => {
                            const name = p.members_v2?.full_name || p.participant_name || '—';
                            return (
                              <span key={p.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded-lg text-xs text-gray-300">
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
