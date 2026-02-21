import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import RegistrationModal from '../components/RegistrationModal';
import {
  MdEventAvailable, MdEvent, MdCalendarToday,
  MdCheckCircle, MdArrowBack,
  MdInfo, MdHowToReg
} from 'react-icons/md';

function AdminMyEventsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('upcoming');
  const [churchId, setChurchId] = useState(null);

  // Détail événement
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventFormFields, setEventFormFields] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Inscription
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());

  useEffect(() => {
    fetchData();
    loadRegisteredEvents();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const userInfo = await api.auth.me();
      setChurchId(userInfo.church_id);
      const data = await api.admin.listEvents();
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.response?.data?.error || t('error_fetching_events') || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const loadRegisteredEvents = () => {
    const stored = JSON.parse(localStorage.getItem('registeredEvents')) || {};
    setRegisteredEventIds(new Set(Object.keys(stored)));
  };

  const isRegistered = (eventId) => registeredEventIds.has(eventId);

  const getEventName = (event) => {
    return lang === 'fr' ? event.name_fr : (event.name_en || event.name_fr);
  };

  const getEventDescription = (event) => {
    return lang === 'fr' ? event.description_fr : (event.description_en || event.description_fr);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return { date: '', time: '' };
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { date: '', time: '' };
    return {
      date: d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }),
      time: d.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        hour: '2-digit', minute: '2-digit'
      })
    };
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const isUpcoming = (event) => {
    const dateStr = event.event_end_date || event.event_start_date;
    if (!dateStr) return false;
    return new Date(dateStr) >= new Date();
  };

  const filteredEvents = events.filter(event => {
    if (event.is_archived) return false;
    if (filter === 'upcoming') return isUpcoming(event);
    if (filter === 'past') return !isUpcoming(event);
    return true;
  });

  const handleSelectEvent = async (event) => {
    setSelectedEvent(event);
    setLoadingDetail(true);
    try {
      if (churchId) {
        const fields = await api.public.getEventFormFields(churchId, event.id);
        setEventFormFields(fields || []);
      }
    } catch (err) {
      console.error('Error fetching form fields:', err);
      setEventFormFields([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRegistrationClose = (success) => {
    setShowRegistrationModal(false);
    if (success) loadRegisteredEvents();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // ─── Vue détaillée d'un événement ───
  if (selectedEvent) {
    const { date: startDate, time: startTime } = formatDateTime(selectedEvent.event_start_date);
    const { date: endDate, time: endTime } = formatDateTime(selectedEvent.event_end_date);
    const upcoming = isUpcoming(selectedEvent);
    const registered = isRegistered(selectedEvent.id);

    return (
      <div className="space-y-6">
        {/* Retour */}
        <button
          onClick={() => { setSelectedEvent(null); setEventFormFields([]); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <MdArrowBack size={20} />
          {t('back_to_events') || 'Retour aux événements'}
        </button>

        {/* Image */}
        {selectedEvent.background_image_url && (
          <div className="h-48 md:h-64 rounded-xl overflow-hidden">
            <img
              src={selectedEvent.background_image_url}
              alt={getEventName(selectedEvent)}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contenu 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Titre + badges */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {upcoming ? (
                  <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 text-sm font-medium rounded-full">
                    {t('upcoming') || 'À venir'}
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
                {getEventName(selectedEvent)}
              </h1>
            </div>

            {/* Description */}
            {getEventDescription(selectedEvent) && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <h3 className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <MdInfo className="text-indigo-400" />
                  {t('description') || 'Description'}
                </h3>
                <p className="text-gray-200 whitespace-pre-line">
                  {getEventDescription(selectedEvent)}
                </p>
              </div>
            )}

            {/* Champs d'inscription */}
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

          {/* Sidebar 1/3 */}
          <div className="space-y-4">
            {/* Dates */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <MdCalendarToday className="text-indigo-400" />
                {t('date_and_time') || 'Date et heure'}
              </h3>
              <div className="space-y-3">
                {startDate && (
                  <div>
                    <p className="text-gray-400 text-xs uppercase">{t('start') || 'Début'}</p>
                    <p className="text-white">{startDate}</p>
                    {startTime && <p className="text-gray-300 text-sm">{startTime}</p>}
                  </div>
                )}
                {endDate && (
                  <div>
                    <p className="text-gray-400 text-xs uppercase">{t('end') || 'Fin'}</p>
                    <p className="text-white">{endDate}</p>
                    {endTime && <p className="text-gray-300 text-sm">{endTime}</p>}
                  </div>
                )}
                {!startDate && !endDate && (
                  <p className="text-gray-500 text-sm">{t('no_date') || 'Date non définie'}</p>
                )}
              </div>
            </div>

            {/* Bouton inscription */}
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
                  <><MdCheckCircle size={20} /> {t('already_registered') || 'Déjà inscrit'}</>
                ) : (
                  <><MdHowToReg size={20} /> {t('register_for_event') || "S'inscrire"}</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Modal inscription */}
        <RegistrationModal
          isOpen={showRegistrationModal}
          onClose={handleRegistrationClose}
          eventId={selectedEvent.id}
          churchId={churchId}
        />
      </div>
    );
  }

  // ─── Vue liste des événements ───
  return (
    <div className="space-y-6">
      {/* Header + Filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <MdEventAvailable className="text-3xl text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">{t('my_events') || 'Mes Événements'}</h1>
            <p className="text-gray-400 text-sm">{t('my_events_subtitle') || 'Événements de votre église'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { key: 'upcoming', label: t('upcoming') || 'À venir' },
            { key: 'past', label: t('past') || 'Passés' },
            { key: 'all', label: t('all') || 'Tous' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">{error}</div>
      )}

      {/* Grille événements */}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => {
            const upcoming = isUpcoming(event);
            const registered = isRegistered(event.id);

            return (
              <div
                key={event.id}
                onClick={() => handleSelectEvent(event)}
                className={`bg-gray-800 rounded-xl border overflow-hidden transition-all cursor-pointer hover:border-gray-500 hover:shadow-lg hover:shadow-black/20 ${
                  upcoming ? 'border-indigo-700/50' : 'border-gray-700'
                }`}
              >
                {/* Image */}
                {event.background_image_url ? (
                  <div className="h-40 overflow-hidden relative">
                    <img
                      src={event.background_image_url}
                      alt={getEventName(event)}
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

                {/* Contenu carte */}
                <div className="p-4 space-y-3">
                  {/* Badge statut */}
                  <div className="flex items-center gap-2">
                    {upcoming ? (
                      <span className="px-2 py-1 bg-indigo-600/20 text-indigo-400 text-xs font-medium rounded-full">
                        {t('upcoming') || 'À venir'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs font-medium rounded-full">
                        {t('completed') || 'Terminé'}
                      </span>
                    )}
                  </div>

                  {/* Titre */}
                  <h3 className="text-lg font-semibold text-white">{getEventName(event)}</h3>

                  {/* Description tronquée */}
                  {getEventDescription(event) && (
                    <p className="text-sm text-gray-400 line-clamp-2">{getEventDescription(event)}</p>
                  )}

                  {/* Date */}
                  <div className="space-y-2 pt-2 border-t border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <MdCalendarToday className="text-gray-500 flex-shrink-0" />
                      <span className="truncate">{formatDateShort(event.event_start_date)}</span>
                    </div>
                  </div>

                  {/* Lien détails */}
                  <div className="pt-2">
                    <span className="text-indigo-400 text-sm font-medium flex items-center gap-1">
                      {t('view_details') || 'Voir les détails'} →
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

export default AdminMyEventsPage;
