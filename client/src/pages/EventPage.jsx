import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Ajout de useNavigate
import { useTranslation } from 'react-i18next';
import RegistrationModal from '../components/RegistrationModal';
import logo from '../assets/logo_eden.png';
import './EventPage.css';
import { api } from '../api/api'; // Utilisation de notre objet api
import LoadingSpinner from '../components/LoadingSpinner';

function EventPage() {
  const { t, i18n } = useTranslation();
  const { churchId, id } = useParams(); // Récupérer churchId et id de l'URL
  const navigate = useNavigate(); // Initialisation de useNavigate
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        if (!churchId) {
          setError(t('error_church_id_missing_public'));
          setLoading(false);
          navigate('/'); // Rediriger vers la page d'accueil si churchId est manquant
          return;
        }
        const response = await api.public.getEventDetails(churchId, id); // Passer churchId et id à l'API
        setEvent(response);
      } catch (err) {
        setError(err.response?.data?.error || err.message || t('error_fetching_event_details'));
        console.error('Error fetching event:', err);
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
  }, [churchId, id, t, navigate]); // Ajout de churchId et navigate aux dépendances

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

  if (loading) return <LoadingSpinner className="h-screen" />;
  if (error) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><p style={{ color: 'red' }}>{t('error')}: {error}</p></div>;
  if (!event) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><p>{t('event_not_found')}</p></div>;

  const currentEventTitle = i18n.language === 'fr' ? event.name_fr : event.name_en;
  const currentEventDescription = i18n.language === 'fr' ? event.description_fr : event.description_en;

  return (
    <div className="pageStyle" style={pageStyle}>
      <div className="contentWrapperStyle">
        <div className="imageContainer"></div>
        <div className="textContainer">
          <img src={event.church?.logo_url || logo} alt="Logo" className="logoStyle fade-in-up fade-in-up-1" />
          <p style={{ fontWeight: 'bold', fontSize: '16px', marginTop: '10px', marginBottom: '15px', color: 'inherit' }} className="fade-in-up fade-in-up-1">{event.church?.name || 'MY EDEN X'}</p>

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
        churchId={churchId} /* Passer churchId à RegistrationModal */
      />
    </div>
  );
}

export default EventPage;
