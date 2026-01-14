import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Importation de useNavigate
import { useTranslation } from 'react-i18next';
import { api } from '../api/api'; // Utilisation de notre objet api
import logo from '../assets/logo_eden.png';
import './WelcomeCheckinPage.css';

function WelcomeCheckinPage() {
  const { churchId, id } = useParams(); // Récupérer churchId et id de l'URL
  const { t, i18n } = useTranslation();
  const navigate = useNavigate(); // Initialisation de useNavigate
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEventDetails = async () => {
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
        console.error('Error fetching event details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [churchId, id, t, navigate]); // Ajout de churchId et navigate aux dépendances

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
