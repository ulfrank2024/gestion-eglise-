import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/api';
import logo from '../assets/logo_eden.jpg'; // Importation du logo
import './WelcomeCheckinPage.css';

function WelcomeCheckinPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const response = await apiClient.get(`/public/events/${id}`);
        setEvent(response.data);
      } catch (err) {
        setError(t('error_fetching_event_details'));
        console.error('Error fetching event details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id, t]);

  // Gérer le style de débordement du body pour cette page uniquement
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  // Le style de l'image de fond est maintenant géré par une classe et une variable CSS
  // pour un meilleur contrôle en mode responsive.
  const pageStyle = {
    '--background-image-url': event ? `url(${event.background_image_url})` : 'none'
  };

  if (loading) {
    return <div className="loading-container"><p>{t('loading')}...</p></div>;
  }

  if (error) {
    return <div className="error-container"><p>{error}</p></div>;
  }

  if (!event) {
    return <div className="error-container"><p>{t('event_not_found')}</p></div>;
  }

  const eventName = i18n.language === 'fr' ? event.name_fr : event.name_en;

  return (
    <div className="welcome-page-container" style={pageStyle}>
      <div className="content-overlay">
        {/* Conteneur pour l'image (visible sur desktop) */}
        <div 
          className="imageContainer"
          style={{ backgroundImage: `var(--background-image-url)` }}
        ></div>

        {/* Conteneur pour le texte */}
        <div className="textContainer">
          {/* Logo */}
          <img src={logo} alt="Logo" className="logoStyle" />
          
          <h1 className="welcome-title">{t('welcome_to_cite_eden')}</h1>
          <p className="event-intro">{t('participating_in_event')}</p>
          <h2 className="event-name">{eventName}</h2>

          <div className="language-switcher-container">
            <button 
              onClick={() => handleLanguageChange('fr')}
              className={`lang-button ${i18n.language === 'fr' ? 'active' : ''}`}
            >
              FR
            </button>
            <button 
              onClick={() => handleLanguageChange('en')}
              className={`lang-button ${i18n.language === 'en' ? 'active' : ''}`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeCheckinPage;
