import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MdHistory, MdEvent, MdFilterList, MdPeople, MdVisibility,
  MdArchive, MdCheckCircle, MdCalendarToday, MdSearch
} from 'react-icons/md';

function AdminEventHistoryPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('completed');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError('');
        const isArchived = filterStatus === 'completed' ? true : undefined;
        const data = await api.admin.listEvents(isArchived);
        setEvents(data || []);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError(err.response?.data?.error || err.message);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [filterStatus, navigate]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const filtered = events.filter(event => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (event.name_fr || '').toLowerCase().includes(q) ||
      (event.name_en || '').toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MdHistory className="text-3xl text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{t('event_history')}</h1>
            <p className="text-gray-400 text-sm">
              {filtered.length} {t('events_total') || 'événement(s)'}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'completed', label: t('eventStatus.archived') || 'Archivés', icon: MdArchive },
            { key: 'all', label: t('eventStatus.all') || 'Tous', icon: MdEvent },
          ].map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === f.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Icon size={16} />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('search_event') || 'Rechercher un événement...'}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdHistory className="mx-auto text-6xl text-gray-600 mb-4" />
          <p className="text-gray-400">{t('no_events_in_history') || 'Aucun événement dans l\'historique'}</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {/* En-têtes table */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-700 border-b border-gray-600 text-xs font-semibold text-gray-300 uppercase tracking-wide">
            <div className="col-span-4">{t('event_name_fr') || 'Nom (FR)'}</div>
            <div className="col-span-3">{t('event_name_en') || 'Nom (EN)'}</div>
            <div className="col-span-2 text-center">{t('participants') || 'Inscrits'}</div>
            <div className="col-span-1 text-center">{t('date') || 'Date'}</div>
            <div className="col-span-1 text-center">{t('status') || 'Statut'}</div>
            <div className="col-span-1 text-center">{t('actions') || 'Actions'}</div>
          </div>

          <div className="divide-y divide-gray-700">
            {filtered.map((event) => (
              <div
                key={event.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-4 hover:bg-gray-750 transition-colors"
              >
                {/* Nom FR */}
                <div className="md:col-span-4 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${event.is_archived ? 'bg-gray-500' : 'bg-green-500'}`} />
                  <span className="text-gray-100 font-medium text-sm truncate">{event.name_fr}</span>
                </div>

                {/* Nom EN */}
                <div className="md:col-span-3 flex items-center">
                  <span className="text-gray-400 text-sm truncate">{event.name_en || '-'}</span>
                </div>

                {/* Participants */}
                <div className="md:col-span-2 flex items-center md:justify-center gap-2">
                  <MdPeople className="text-gray-500 md:hidden" size={16} />
                  <span className="text-gray-300 text-sm font-medium">{event.attendeeCount || 0}</span>
                  <span className="md:hidden text-gray-500 text-xs">{t('participants') || 'inscrits'}</span>
                </div>

                {/* Date */}
                <div className="md:col-span-1 flex items-center md:justify-center gap-2">
                  <MdCalendarToday className="text-gray-500 shrink-0" size={14} />
                  <span className="text-gray-400 text-xs">{formatDate(event.event_start_date)}</span>
                </div>

                {/* Statut */}
                <div className="md:col-span-1 flex items-center md:justify-center">
                  {event.is_archived ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full">
                      <MdArchive size={12} />
                      {t('eventStatus.archived') || 'Archivé'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded-full">
                      <MdCheckCircle size={12} />
                      {t('eventStatus.active') || 'Actif'}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="md:col-span-1 flex items-center md:justify-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/events/${event.id}`)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs transition-colors"
                    title={t('view_details') || 'Voir les détails'}
                  >
                    <MdVisibility size={14} />
                    <span className="md:hidden">{t('view_details') || 'Voir'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminEventHistoryPage;
