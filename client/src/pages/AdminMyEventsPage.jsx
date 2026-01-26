import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { Link } from 'react-router-dom';
import {
  MdEventAvailable, MdEvent, MdCalendarToday, MdLocationOn,
  MdPeople, MdCheckCircle, MdAccessTime
} from 'react-icons/md';

function AdminMyEventsPage() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');

      // Récupérer les événements via l'API admin (liste tous les événements de l'église)
      const data = await api.admin.listEvents();
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.response?.data?.error || t('error_fetching_events') || 'Erreur lors de la récupération des événements');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const isUpcoming = (event) => {
    if (!event.event_start_date) return false;
    return new Date(event.event_start_date) >= new Date();
  };

  const isPast = (event) => {
    if (!event.event_start_date) return false;
    return new Date(event.event_start_date) < new Date();
  };

  const filteredEvents = events.filter(event => {
    if (event.is_archived) return false;
    if (filter === 'upcoming') return isUpcoming(event);
    if (filter === 'past') return isPast(event);
    return true;
  });

  const getEventName = (event) => {
    return i18n.language === 'fr' ? event.name_fr : (event.name_en || event.name_fr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-300">{t('loading')}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <MdEventAvailable className="text-3xl text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">{t('my_events') || 'Mes Événements'}</h1>
            <p className="text-gray-400 text-sm">
              {t('my_events_subtitle') || 'Événements de votre église'}
            </p>
          </div>
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
            {t('upcoming') || 'À venir'}
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'past'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('past') || 'Passés'}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('all') || 'Tous'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdEvent className="mx-auto text-6xl text-gray-600 mb-4" />
          <p className="text-gray-400">
            {filter === 'upcoming'
              ? (t('no_upcoming_events') || 'Aucun événement à venir')
              : filter === 'past'
              ? (t('no_past_events') || 'Aucun événement passé')
              : (t('no_events') || 'Aucun événement')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-indigo-500 transition-colors"
            >
              {/* Image de l'événement */}
              {event.background_image_url ? (
                <img
                  src={event.background_image_url}
                  alt={getEventName(event)}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                  <MdEvent className="text-6xl text-white/50" />
                </div>
              )}

              {/* Contenu */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {getEventName(event)}
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <MdCalendarToday />
                    <span>{formatDate(event.event_start_date)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400">
                    <MdPeople />
                    <span>{event.attendeeCount || 0} {t('registered') || 'inscrits'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400">
                    <MdCheckCircle />
                    <span>{event.checkinCount || 0} {t('checked_in') || 'pointés'}</span>
                  </div>
                </div>

                {/* Badge status */}
                <div className="mt-3">
                  {isUpcoming(event) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-full">
                      <MdAccessTime />
                      {t('upcoming') || 'À venir'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded-full">
                      <MdCheckCircle />
                      {t('completed') || 'Terminé'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('summary') || 'Résumé'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-400">{events.filter(e => !e.is_archived).length}</p>
            <p className="text-gray-400 text-sm">{t('total_events') || 'Total événements'}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400">{events.filter(e => !e.is_archived && isUpcoming(e)).length}</p>
            <p className="text-gray-400 text-sm">{t('upcoming') || 'À venir'}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-400">
              {events.reduce((sum, e) => sum + (e.attendeeCount || 0), 0)}
            </p>
            <p className="text-gray-400 text-sm">{t('total_registrations') || 'Total inscrits'}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-400">
              {events.reduce((sum, e) => sum + (e.checkinCount || 0), 0)}
            </p>
            <p className="text-gray-400 text-sm">{t('total_checkins') || 'Total pointés'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminMyEventsPage;
