import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import './RegistrationModal.css';

function RegistrationModal({ isOpen, onClose, eventId, churchId }) {
  const { t, i18n } = useTranslation();
  
  // États pour les champs fixes
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // États pour les champs dynamiques et la logique du formulaire
  const [customFormFields, setCustomFormFields] = useState([]);
  const [customFormData, setCustomFormData] = useState({});
  
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Un seul état de chargement

  useEffect(() => {
    if (isOpen) {
      // Réinitialiser tous les états à l'ouverture
      setFullName('');
      setEmail('');
      setPhone('');
      setCustomFormData({});
      setCustomFormFields([]);
      setRegistrationMessage('');
      setError('');
      setLoading(true);

      const fetchFormFields = async () => {
        try {
          if (!churchId) {
            setError(t('error_church_id_missing_public'));
            return;
          }
          const data = await api.public.getEventFormFields(churchId, eventId);
          setCustomFormFields(data);
          
          const initialCustomFormData = {};
          data.forEach(field => {
            initialCustomFormData[field.label_en] = field.field_type === 'checkbox' ? false : '';
          });
          setCustomFormData(initialCustomFormData);

        } catch (err) {
          console.error('Failed to fetch form fields', err);
          setError(err.response?.data?.error || err.message || t('error_fetching_fields'));
        } finally {
          setLoading(false);
        }
      };
      fetchFormFields();
    }
  }, [isOpen, eventId, churchId, t]);

  const handleCustomInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRegistrationMessage('');
    setError('');

    if (!churchId) {
      setError(t('error_church_id_missing_public'));
      setLoading(false);
      return;
    }

    // Validation des champs fixes obligatoires
    if (!fullName || !email) {
      setError(t('name_and_email_are_required'));
      setLoading(false);
      return;
    }

    const payload = {
      fullName,
      email,
      formResponses: {
        phone, // Inclure le téléphone
        ...customFormData, // Inclure les réponses des champs personnalisés
      },
    };
    
    try {
      await api.public.registerAttendee(churchId, eventId, payload);
      
      setRegistrationMessage(t('registration_successful'));
      const registeredEvents = JSON.parse(localStorage.getItem('registeredEvents')) || {};
      registeredEvents[eventId] = true;
      localStorage.setItem('registeredEvents', JSON.stringify(registeredEvents));
      
      setTimeout(() => {
        onClose(true);
      }, 1500);

    } catch (err) {
      if (err.response && err.response.status === 409) {
        setRegistrationMessage(t('already_registered'));
        const registeredEvents = JSON.parse(localStorage.getItem('registeredEvents')) || {};
        registeredEvents[eventId] = true;
        localStorage.setItem('registeredEvents', JSON.stringify(registeredEvents));
        setTimeout(() => {
            onClose(true);
        }, 1500);
      } else {
        setError(err.response?.data?.error || err.message || t('registration_failed'));
      }
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const label = i18n.language === 'fr' ? field.label_fr : field.label_en;
    const fieldName = field.label_en;

    switch (field.field_type) {
      case 'checkbox':
        return (
          <div className="checkboxContainer" key={field.id}>
            <input
              type="checkbox"
              id={field.id}
              name={fieldName}
              checked={customFormData[fieldName] || false}
              onChange={handleCustomInputChange}
            />
            <label htmlFor={field.id}>{label}{field.is_required && '*'}</label>
          </div>
        );
      default:
        return (
          <div key={field.id}>
            <label htmlFor={field.id} className="formField">{label}{field.is_required && ' *'}</label>
            <input
              type={field.field_type}
              id={field.id}
              name={fieldName}
              value={customFormData[fieldName] || ''}
              onChange={handleCustomInputChange}
              required={field.is_required}
              className="formInput"
            />
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modalOverlay" onClick={() => onClose(false)}>
      <div className="modalContent" onClick={e => e.stopPropagation()}>
        <button className="closeButton" onClick={() => onClose(false)}>&times;</button>
        <h3>{t('registration_form')}</h3>

        {registrationMessage && <p style={{ color: 'green', fontWeight: 'bold' }}>{registrationMessage}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        
        <form onSubmit={handleRegistration} className="registrationForm">
          
          {/* Champs fixes */}
          <div>
            <label htmlFor="fullName" className="formField">{t('full_name')} *</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="formInput"
            />
          </div>
          <div>
            <label htmlFor="email" className="formField">{t('email')} *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="formInput"
            />
          </div>
          <div>
            <label htmlFor="phone" className="formField">{t('phone')}</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="formInput"
            />
          </div>

          {/* Séparateur visuel */}
          {customFormFields.length > 0 && <hr className="formSeparator" />}

          {/* Champs personnalisés */}
          {loading ? (
             <p>{t('loading_fields')}...</p>
          ) : (
            customFormFields.map(field => renderField(field))
          )}

          <button type="submit" disabled={loading} className="submitButton">
            {loading ? t('submitting') : t('register')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegistrationModal;
