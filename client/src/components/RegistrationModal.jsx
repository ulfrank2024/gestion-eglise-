import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api'; // Utilisation de notre objet api
import './RegistrationModal.css';

function RegistrationModal({ isOpen, onClose, eventId, churchId }) { // Ajout de churchId aux props
  const { t, i18n } = useTranslation();
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [error, setError] = useState('');
  const [registrationLoading, setRegistrationLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRegistrationMessage('');
      setError('');
      setRegistrationLoading(false);
      setFormFields([]);

      const fetchFormFields = async () => {
        try {
          if (!churchId) { // Vérifier si churchId est disponible
            setError(t('error_church_id_missing_public')); // Nouvelle clé de traduction
            return;
          }
          const data = await api.public.getEventFormFields(churchId, eventId); // Utiliser churchId
          setFields(data);
          
          const initialFormData = {};
          data.forEach(field => { // Utiliser 'data' au lieu de 'fields'
            initialFormData[field.label_en] = field.field_type === 'checkbox' ? false : '';
          });
          setFormData(initialFormData);

        } catch (err) {
          console.error('Failed to fetch form fields', err);
          setError(err.response?.data?.error || err.message || t('error_fetching_fields'));
        }
      };
      fetchFormFields();
    }
  }, [isOpen, eventId, churchId, t]); // Ajout de churchId aux dépendances

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    setRegistrationLoading(true);
    setRegistrationMessage('');
    setError('');

    if (!churchId) { // Vérifier si churchId est disponible
      setError(t('error_church_id_missing_public'));
      setRegistrationLoading(false);
      return;
    }

    const emailField = formFields.find(f => f.field_type === 'email');
    const nameField = formFields.find(f => f.label_en.toLowerCase().includes('name'));

    const email = emailField ? formData[emailField.label_en] : '';
    const fullName = nameField ? formData[nameField.label_en] : '';

    if (!fullName || !email) {
      setError(t('name_and_email_are_required_in_form'));
      setRegistrationLoading(false);
      return;
    }

    const payload = {
      fullName,
      email,
      formResponses: { ...formData },
    };
    
    try {
      await api.public.registerAttendee(churchId, eventId, payload); // Utiliser churchId
      
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
        setError(err.response?.data?.error || err.message || t('registration_failed')); // Nouvelle clé
      }
      console.error('Registration error:', err);
    } finally {
      setRegistrationLoading(false);
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
              checked={formData[fieldName] || false}
              onChange={handleInputChange}
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
              value={formData[fieldName] || ''}
              onChange={handleInputChange}
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
          
          {formFields.length > 0 ? (
            formFields.map(field => renderField(field))
          ) : (
            <p>{t('loading_fields')}...</p>
          )}

          <button type="submit" disabled={registrationLoading || formFields.length === 0} className="submitButton">
            {registrationLoading ? t('submitting') : t('register')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegistrationModal;
