import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import RegistrationModal from '../components/RegistrationModal';
import {
  MdEvent, MdCalendarToday, MdAccessTime, MdLocationOn,
  MdArrowBack, MdHowToReg, MdInfo, MdPeople, MdCheckCircle,
  MdArchive, MdHistoryEdu
} from 'react-icons/md';

function MemberEventsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { churchInfo, memberInfo } = useOutletContext();

  const [events, setEvents] = useState([]);
  const [participatedEvents, setParticipatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all, participated

  // État pour le détail d'un événement
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventFormFields, setEventFormFields] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // État pour le modal d'inscription
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());

  useEffect(() => {
    fetchEvents();
    loadRegisteredEvents();
    fetchParticipatedEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const data = await api.member.getEvents();
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipatedEvents = async () => {
    try {
      const data = await api.member.getParticipatedEvents();
      setParticipatedEvents(data || []);
    } catch (err) {
      console.error('Error fetching participated events:', err);
    }
  };

  const loadRegisteredEvents = () => {
    const stored = JSON.parse(localStorage.getItem('registeredEvents')) || {};
    setRegisteredEventIds(new Set(Object.keys(stored)));
  };

  const isRegistered = (eventId) => {
    return registeredEventIds.has(eventId);
  };

  const handleSelectEvent = async (event) => {
    setSelectedEvent(event);
    setLoadingDetail(true);
    try {
      // Récupérer les champs du formulaire pour cet événement
      const churchId = churchInfo?.id || churchInfo?.subdomain;
      if (churchId) {
        const fields = await api.public.getEventFormFields(churchId, event.id);
        setEventFormFields(fields || []);
      }
    } catch (err) {
      console.error('Error fetching event details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRegistrationClose = (success) => {
    setShowRegistrationModal(false);
    if (success) {
      loadRegisteredEvents();
    }
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return { date: '-', time: '' };
    const date = new Date(datetime);
    if (isNaN(date.getTime())) return { date: '-', time: '' };
    return {
      date: date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const isUpcoming = (datetime) => {
    if (!datetime) return false;
    const d = new Date(datetime);
    if (isNaN(d.getTime())) return false;
    return d > new Date();
  };

  const getEventStatus = (event) => {
    if (event.is_archived) return 'archived';
    if (!isUpcoming(event.event_start_date)) return 'past';
    return 'upcoming';
  };

  const filteredEvents = filter === 'participated'
    ? participatedEvents
    : events.filter(event => {
        const upcoming = isUpcoming(event.event_start_date);
        if (filter === 'upcoming') return upcoming;
        if (filter === 'past') return !upcoming;
        return true;
      });

  if (loading) {
    return <LoadingSpinner />;
  }

  // Vue détaillée d'un événement
  if (selectedEvent) {
    const { date: startDate, time: startTime } = formatDateTime(selectedEvent.event_start_date);
    const { date: endDate, time: endTime } = formatDateTime(selectedEvent.event_end_date);
    const upcoming = isUpcoming(selectedEvent.event_start_date);
    const registered = isRegistered(selectedEvent.id);
    const churchId = churchInfo?.id || churchInfo?.subdomain;

    return (
      <div className="space-y-6">
        {/* Bouton retour */}
        <button
          onClick={() => setSelectedEvent(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <MdArrowBack size={20} />
          {t('back_to_events') || 'Retour aux événements'}
        </button>

        {/* Image de couverture */}
        {selectedEvent.background_image_url && (
          <div className="h-48 md:h-64 rounded-xl overflow-hidden">
            <img
              src={selectedEvent.background_image_url}
              alt={lang === 'fr' ? selectedEvent.name_fr : selectedEvent.name_en}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Détails de l'événement - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Titre et badge */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                {upcoming ? (
                  <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 text-sm font-medium rounded-full">
                    {t('upcoming_events') || 'À venir'}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-700 text-gray-400 text-sm font-medium rounded-full">
                    {t('completed') || 'Terminé'}
                  </span>
                )}
                {registered && (
                  <span className="px-3 py-1 bg-green-600/20 text-green-400 text-sm font-medium rounded-full flex items-center gap-1">
                    <MdCheckCircle size={16} />
                    {t('registered') || 'Inscrit'}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {lang === 'fr' ? selectedEvent.name_fr : selectedEvent.name_en}
              </h1>
            </div>

            {/* Description */}
            {(selectedEvent.description_fr || selectedEvent.description_en) && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <h3 className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <MdInfo className="text-indigo-400" />
                  {t('description') || 'Description'}
                </h3>
                <p className="text-gray-200 whitespace-pre-line">
                  {lang === 'fr' ? selectedEvent.description_fr : selectedEvent.description_en}
                </p>
              </div>
            )}

            {/* Champs du formulaire d'inscription */}
            {!loadingDetail && eventFormFields.length > 0 && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <h3 className="text-gray-400 text-sm font-medium mb-3">
                  {t('registration_fields') || 'Informations demandées lors de l\'inscription'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {eventFormFields.map(field => (
                    <span key={field.id} className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-full">
                      {lang === 'fr' ? field.label_fr : field.label_en}
                      {field.is_required && ' *'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - 1/3 */}
          <div className="space-y-4">
            {/* Date et heure */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <MdCalendarToday className="text-indigo-400" />
                {t('date_and_time') || 'Date et heure'}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-xs uppercase">{t('start') || 'Début'}</p>
                  <p className="text-white">{startDate}</p>
                  {startTime && <p className="text-gray-300 text-sm">{startTime}</p>}
                </div>
                {(selectedEvent.event_end_date) && (
                  <div>
                    <p className="text-gray-400 text-xs uppercase">{t('end') || 'Fin'}</p>
                    <p className="text-white">{endDate}</p>
                    {endTime && <p className="text-gray-300 text-sm">{endTime}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Statistiques */}
            {selectedEvent.checkin_count !== undefined && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                  <MdPeople className="text-green-400" />
                  {t('participation') || 'Participation'}
                </h3>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-400">{selectedEvent.checkin_count || 0}</p>
                  <p className="text-gray-400 text-sm">{t('checked_in') || 'Présents'}</p>
                </div>
              </div>
            )}

            {/* Bouton d'inscription */}
            {upcoming && (
              <button
                onClick={() => setShowRegistrationModal(true)}
                disabled={registered}
                className={`w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all ${
                  registered
                    ? 'bg-green-700 cursor-default'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                }`}
              >
                {registered ? (
                  <>
                    <MdCheckCircle size={20} />
                    {t('already_registered') || 'Déjà inscrit'}
                  </>
                ) : (
                  <>
                    <MdHowToReg size={20} />
                    {t('register_for_event') || "S'inscrire à cet événement"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Modal d'inscription */}
        <RegistrationModal
          isOpen={showRegistrationModal}
          onClose={handleRegistrationClose}
          eventId={selectedEvent.id}
          churchId={churchId}
        />
      </div>
    );
  }

  // Vue liste des événements
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <MdEvent className="text-3xl text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">{t('events') || 'Événements'}</h1>
            <p className="text-gray-400 text-sm">{t('church_events_subtitle') || 'Événements de votre église'}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'upcoming', label: t('upcoming_events') || 'À venir' },
            { key: 'past', label: t('past') || 'Passés' },
            { key: 'all', label: t('all') || 'Tous' },
            { key: 'participated', label: t('participated') || 'Participé', count: participatedEvents.length }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setSelectedEvent(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.key === 'participated' && <MdHistoryEdu size={15} />}
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  filter === f.key ? 'bg-indigo-500' : 'bg-gray-600'
                }`}>{f.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdEvent className="mx-auto text-6xl text-gray-600 mb-4" />
          <p className="text-gray-400">
            {filter === 'upcoming'
              ? (t('no_upcoming_events') || 'Aucun événement à venir')
              : filter === 'past'
              ? (t('no_past_events') || 'Aucun événement passé')
              : filter === 'participated'
              ? (t('no_participated_events') || 'Vous n\'avez participé à aucun événement')
              : (t('no_events_yet') || 'Aucun événement')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => {
            const { date, time } = formatDateTime(event.event_start_date);
            const eventStatus = getEventStatus(event);
            const registered = isRegistered(event.id) || filter === 'participated';
            const isParticipatedView = filter === 'participated';

            return (
              <div
                key={event.id}
                onClick={() => handleSelectEvent(event)}
                className={`bg-gray-800 rounded-xl border overflow-hidden transition-all cursor-pointer hover:border-gray-500 hover:shadow-lg hover:shadow-black/20 ${
                  eventStatus === 'upcoming' ? 'border-indigo-700/50' : 'border-gray-700'
                }`}
              >
                {/* Event Image */}
                {event.background_image_url ? (
                  <div className="h-40 overflow-hidden relative">
                    <img
                      src={event.background_image_url}
                      alt={lang === 'fr' ? event.name_fr : event.name_en}
                      className="w-full h-full object-cover"
                    />
                    {registered && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                        <MdCheckCircle size={14} />
                        {t('registered') || 'Inscrit'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 flex items-center justify-center relative">
                    <MdEvent className="text-4xl text-indigo-400/50" />
                    {registered && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                        <MdCheckCircle size={14} />
                        {t('registered') || 'Inscrit'}
                      </div>
                    )}
                  </div>
                )}

                {/* Event Details */}
                <div className="p-4 space-y-3">
                  {/* Status badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {eventStatus === 'upcoming' ? (
                      <span className="px-2 py-1 bg-indigo-600/20 text-indigo-400 text-xs font-medium rounded-full">
                        {t('upcoming_events') || 'À venir'}
                      </span>
                    ) : eventStatus === 'archived' ? (
                      <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs font-medium rounded-full flex items-center gap-1">
                        <MdArchive size={12} />
                        {t('event_archived_by_admin') || 'Terminé (archivé)'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-900/30 text-amber-400 text-xs font-medium rounded-full">
                        {t('event_passed') || 'Passé'}
                      </span>
                    )}
                    {isParticipatedView && event.registered_at && (
                      <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs font-medium rounded-full flex items-center gap-1">
                        <MdCheckCircle size={12} />
                        {t('registered') || 'Inscrit'}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-white">
                    {lang === 'fr' ? event.name_fr : event.name_en}
                  </h3>

                  {/* Description */}
                  {(event.description_fr || event.description_en) && (
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {lang === 'fr' ? event.description_fr : event.description_en}
                    </p>
                  )}

                  {/* Date and Time */}
                  <div className="space-y-2 pt-2 border-t border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <MdCalendarToday className="text-gray-500 flex-shrink-0" />
                      <span className="truncate">{date}</span>
                    </div>
                    {time && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <MdAccessTime className="text-gray-500 flex-shrink-0" />
                        {time}
                      </div>
                    )}
                    {isParticipatedView && event.registered_at && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                        <MdHistoryEdu className="flex-shrink-0" />
                        {t('registered_at') || 'Inscrit le'}: {formatDateTime(event.registered_at).date}
                      </div>
                    )}
                  </div>

                  {/* Bouton voir détails */}
                  <div className="pt-2">
                    <span className="text-indigo-400 text-sm font-medium hover:text-indigo-300 flex items-center gap-1">
                      {t('view_details') || 'Voir les détails'}
                      →
                    </span>
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

export default MemberEventsPage;
