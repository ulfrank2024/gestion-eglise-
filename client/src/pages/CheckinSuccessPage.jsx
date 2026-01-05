import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheckCircle } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/api';
import './CheckinSuccessPage.css';

function CheckinSuccessPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const biblicalQuote = {
    fr: "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux. - Matthieu 18:20",
    en: "For where two or three gather in my name, there am I with them. - Matthew 18:20",
  };

  useEffect(() => {
    const fetchEventName = async () => {
      const queryParams = new URLSearchParams(location.search);
      const eventId = queryParams.get('eventId');

      if (eventId) {
        try {
          const response = await apiClient.get(`/public/events/${eventId}`);
          setEventName(response.data[`name_${i18n.language}`] || response.data.name_en);
        } catch (err) {
          console.error('Failed to fetch event name:', err);
          setError(t('failed_to_load_event_name'));
        } finally {
          setLoading(false);
        }
      } else {
        setEventName(t('our_event')); // Default if no eventId is found
        setLoading(false);
      }
    };

    fetchEventName();
  }, [location.search, i18n.language, t]);

  if (loading) {
    return <div className="checkin-success-container"><p>{t('loading')}...</p></div>;
  }

  return (
    <div className="checkin-success-container">
      <div className="checkin-success-card">
        <FaCheckCircle className="success-icon" />
        <h1>{t('welcome_to_event', { eventName: eventName })}</h1>
        <p className="biblical-quote">{biblicalQuote[i18n.language]}</p>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default CheckinSuccessPage;
