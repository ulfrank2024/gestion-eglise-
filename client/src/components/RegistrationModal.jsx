import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/api';
import './RegistrationModal.css';

function RegistrationModal({ isOpen, onClose, eventId }) {
  const { t, i18n } = useTranslation();
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [error, setError] = useState('');
  const [registrationLoading, setRegistrationLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setRegistrationMessage('');
      setError('');
      setRegistrationLoading(false);
      setFormFields([]);

      const fetchFormFields = async () => {
        try {
          const response = await apiClient.get(`/public/events/${eventId}/form-fields`);
          const fields = response.data;
          setFormFields(fields);
          
          const initialFormData = {};
          fields.forEach(field => {
            // Use a consistent key, e.g., the English label, for the form state
            initialFormData[field.label_en] = field.field_type === 'checkbox' ? false : '';
          });
          setFormData(initialFormData);

        } catch (err) {
          console.error('Failed to fetch form fields', err);
          setError(t('error_fetching_fields'));
        }
      };
      fetchFormFields();
    }
  }, [isOpen, eventId, t]);

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

    // --- New logic to build the payload ---
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
      await apiClient.post(`/public/events/${eventId}/register`, payload);
      
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
        setError(err.response?.data?.error || err.message || 'Registration failed.');
      }
      console.error('Registration error:', err);
    } finally {
      setRegistrationLoading(false);
    }
  };

  const renderField = (field) => {
    const label = i18n.language === 'fr' ? field.label_fr : field.label_en;
    const fieldName = field.label_en; // Use English label as the key

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
      default: // Handles text, email, etc.
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
