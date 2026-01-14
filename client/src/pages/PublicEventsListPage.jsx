import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/api';
import logo from '../assets/logo_eden.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faInfoCircle, faUserShield } from '@fortawesome/free-solid-svg-icons';

function PublicEventsListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { churchId } = useParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublicEvents = async () => {
      try {
        if (!churchId) {
          setError(t('error_church_id_missing_public'));
          setLoading(false);
          return;
        }
        const response = await api.public.listEvents(churchId);
        setEvents(response);
      } catch (err) {
        setError(err.response?.data?.error || err.message || t('error_fetching_public_events'));
        console.error('Error fetching public events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicEvents();
  }, [churchId, t]);

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  const handleAdminLogin = () => {
    navigate('/admin/login');
  };

  if (loading) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><p>{t('loading')}...</p></div>;
  if (error) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><p style={{ color: 'red' }}>{t('error')}: {error}</p></div>;

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <img src={logo} alt="Logo" style={{ width: '80px', height: 'auto', borderRadius: '100px' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleAdminLogin}
            style={{ padding: '8px 12px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            <FontAwesomeIcon icon={faUserShield} style={{ marginRight: '5px' }} /> {t('admin_login_button')}
          </button>
          <button onClick={() => handleLanguageChange('fr')} style={{ padding: '8px 12px', cursor: 'pointer', fontWeight: i18n.language === 'fr' ? 'bold' : 'normal' }}>FR</button>
          <button onClick={() => handleLanguageChange('en')} style={{ padding: '8px 12px', cursor: 'pointer', fontWeight: i18n.language === 'en' ? 'bold' : 'normal' }}>EN</button>
        </div>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '2.5em' }} className="fade-in-up fade-in-up-1">{t('welcome_message')}</h1>

      {events.length === 0 ? (
        <div className="fade-in-up fade-in-up-2" style={{ textAlign: 'center', padding: '50px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <FontAwesomeIcon icon={faInfoCircle} style={{ fontSize: '3em', color: '#6c757d', marginBottom: '20px' }} />
          <p style={{ fontSize: '1.2em', color: '#6c757d' }}>{t('no_public_events_available')}</p>
          <p style={{ fontSize: '0.9em', color: '#888', marginTop: '10px' }}>{t('check_back_later_or_contact_admin')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
          {events.map((event, index) => (
            <Link
              to={`/${churchId}/event/${event.id}`}
              key={event.id}
              className={`event-card fade-in-up fade-in-up-${index + 2}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <img src={event.background_image_url} alt={i18n.language === 'fr' ? event.name_fr : event.name_en} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                <div style={{ padding: '15px' }}>
                  <h2 style={{ fontSize: '1.4em', margin: '10px 0' }}>{i18n.language === 'fr' ? event.name_fr : event.name_en}</h2>
                  <p style={{ fontSize: '0.9em', color: '#555' }}>
                    <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '8px' }} />
                    {t('view_details')}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p style={{ fontSize: '0.8em', fontStyle: 'italic', textAlign: 'center', marginTop: '60px', color: '#666' }}>
        {t('bible_verse')}
      </p>

    </div>
  );
}

export default PublicEventsListPage;