import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/api';
import { MdEvent, MdCalendarToday, MdAccessTime, MdLocationOn } from 'react-icons/md';

function MemberEventsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { churchInfo } = useOutletContext();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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

    fetchEvents();
  }, []);

  const formatDateTime = (datetime) => {
    const date = new Date(datetime);
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
    return new Date(datetime) > new Date();
  };

  if (loading) {
    return <div className="text-gray-300">{t('loading')}...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MdEvent className="text-3xl text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">{t('my_events')}</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdEvent className="mx-auto text-6xl text-gray-600 mb-4" />
          <p className="text-gray-400">{t('no_events_yet')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const { date, time } = formatDateTime(event.start_datetime);
            const upcoming = isUpcoming(event.start_datetime);

            return (
              <div
                key={event.id}
                className={`bg-gray-800 rounded-xl border overflow-hidden transition-all hover:border-gray-600 ${
                  upcoming ? 'border-indigo-700' : 'border-gray-700'
                }`}
              >
                {/* Event Image */}
                {event.background_image_url && (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={event.background_image_url}
                      alt={lang === 'fr' ? event.name_fr : event.name_en}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Event Details */}
                <div className="p-4 space-y-3">
                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    {upcoming ? (
                      <span className="px-2 py-1 bg-indigo-600/20 text-indigo-400 text-xs font-medium rounded-full">
                        {t('upcoming_events')}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs font-medium rounded-full">
                        {t('completed')}
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
                      <MdCalendarToday className="text-gray-500" />
                      {date}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <MdAccessTime className="text-gray-500" />
                      {time}
                    </div>
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
