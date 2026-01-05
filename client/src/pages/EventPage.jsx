import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RegistrationModal from '../components/RegistrationModal';
import logo from '../assets/logo_eden.jpg';
import './EventPage.css';
import apiClient from '../api/api';

function EventPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await apiClient.get(`/public/events/${id}`);
        setEvent(response.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch event');
      } finally {
        setLoading(false);
      }
    };

    const checkRegistrationStatus = () => {
      const registeredEvents = JSON.parse(localStorage.getItem('registeredEvents')) || {};
      if (registeredEvents[id] === true) {
        setIsRegistered(true);
      }
    };

    fetchEvent();
    checkRegistrationStatus();
  }, [id]);

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };
  
  const handleCloseModal = (didRegister) => {
    setIsModalOpen(false);
    if(didRegister) {
      setIsRegistered(true);
    }
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(i18n.language, { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(date);
  };

  const pageStyle = {
    '--background-image-url': event ? `url(${event.background_image_url})` : 'none'
  };

  const buttonStyle = {
    backgroundColor: isRegistered ? '#28a745' : '#007bff',
    color: 'white',
  };

  if (loading) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><p>{t('loading')}...</p></div>;
  if (error) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><p style={{ color: 'red' }}>{t('error')}: {error}</p></div>;
  if (!event) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><p>{t('event_not_found')}</p></div>;

  const currentEventTitle = i18n.language === 'fr' ? event.name_fr : event.name_en;
  const currentEventDescription = i18n.language === 'fr' ? event.description_fr : event.description_en;

  return (
    <div className="pageStyle" style={pageStyle}>
      <div className="contentWrapperStyle">
        <div className="imageContainer"></div>
        <div className="textContainer">
          <img src={logo} alt="Logo" className="logoStyle fade-in-up fade-in-up-1" />

          <p className="event-page-intro-text fade-in-up fade-in-up-2">{t('event_intro_phrase')}</p>
          <h1 className="titleStyle fade-in-up fade-in-up-3">{currentEventTitle}</h1>

          <div className="date-container fade-in-up fade-in-up-4">
            {formatEventDate(event.event_start_date) && (
              <p><strong>{t('event_date')}:</strong> {formatEventDate(event.event_start_date)}</p>
            )}
          </div>

          <p className="descriptionStyle fade-in-up fade-in-up-5">{currentEventDescription}</p>
          
          <button className="buttonStyle fade-in-up fade-in-up-6" style={buttonStyle} onClick={() => !isRegistered && setIsModalOpen(true)}>
            {isRegistered ? t('already_registered') : t('register')}
          </button>

          <div className="langSelectorStyle fade-in-up fade-in-up-7">
            <button onClick={() => handleLanguageChange('fr')} className={`langButtonStyle ${i18n.language === 'fr' ? 'active' : ''}` }>FR</button>
            <button onClick={() => handleLanguageChange('en')} className={`langButtonStyle ${i18n.language === 'en' ? 'active' : ''}` }>EN</button>
          </div>
        </div>
      </div>

      <RegistrationModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        eventId={id} 
      />
    </div>
  );
}

export default EventPage;
