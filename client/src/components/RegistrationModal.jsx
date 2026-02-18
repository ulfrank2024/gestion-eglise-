import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { getErrorMessage } from '../utils/errorHandler';
import {
  MdClose, MdPerson, MdEmail, MdPhone, MdHowToReg,
  MdCheckCircle, MdError, MdExpandMore
} from 'react-icons/md';
import { InlineSpinner } from './LoadingSpinner';
import './RegistrationModal.css';

function RegistrationModal({ isOpen, onClose, eventId, churchId }) {
  const { t, i18n } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [customFormFields, setCustomFormFields] = useState([]);
  const [customFormData, setCustomFormData] = useState({});

  const [registrationMessage, setRegistrationMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setEmail('');
      setPhone('');
      setCustomFormData({});
      setCustomFormFields([]);
      setRegistrationMessage('');
      setError('');
      setLoading(true);
      setSuccess(false);

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
            if (field.field_type === 'checkbox') {
              initialCustomFormData[field.label_en] = null;
            } else if (field.field_type === 'select') {
              if (field.selection_type === 'multiple') {
                initialCustomFormData[field.label_en] = [];
              } else {
                initialCustomFormData[field.label_en] = '';
              }
            } else {
              initialCustomFormData[field.label_en] = '';
            }
          });
          setCustomFormData(initialCustomFormData);

        } catch (err) {
          console.error('Failed to fetch form fields', err);
          setError(getErrorMessage(err, t));
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

  const handleMultiSelectChange = (fieldName, optionValue, isChecked) => {
    setCustomFormData(prev => {
      const currentValues = prev[fieldName] || [];
      if (isChecked) {
        return { ...prev, [fieldName]: [...currentValues, optionValue] };
      } else {
        return { ...prev, [fieldName]: currentValues.filter(v => v !== optionValue) };
      }
    });
  };

  const handleSingleSelectChange = (fieldName, optionValue) => {
    setCustomFormData(prev => ({ ...prev, [fieldName]: optionValue }));
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

    if (!fullName || !email) {
      setError(t('name_and_email_are_required'));
      setLoading(false);
      return;
    }

    const payload = {
      fullName,
      email,
      formResponses: { phone, ...customFormData },
    };

    try {
      await api.public.registerAttendee(churchId, eventId, payload);

      setSuccess(true);
      setRegistrationMessage(t('registration_successful'));
      const registeredEvents = JSON.parse(localStorage.getItem('registeredEvents')) || {};
      registeredEvents[eventId] = true;
      localStorage.setItem('registeredEvents', JSON.stringify(registeredEvents));

      setTimeout(() => { onClose(true); }, 2000);

    } catch (err) {
      if (err.response && err.response.status === 409) {
        setSuccess(true);
        setRegistrationMessage(t('already_registered'));
        const registeredEvents = JSON.parse(localStorage.getItem('registeredEvents')) || {};
        registeredEvents[eventId] = true;
        localStorage.setItem('registeredEvents', JSON.stringify(registeredEvents));
        setTimeout(() => { onClose(true); }, 2000);
      } else {
        setError(getErrorMessage(err, t));
      }
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getOptionLabel = (option) => {
    return i18n.language === 'fr' ? option.label_fr : option.label_en;
  };

  const renderField = (field) => {
    const label = i18n.language === 'fr' ? field.label_fr : field.label_en;
    const fieldName = field.label_en;

    switch (field.field_type) {
      case 'checkbox':
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {label}{field.is_required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCustomFormData(prev => ({ ...prev, [fieldName]: true }))}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                  customFormData[fieldName] === true
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-indigo-500 hover:text-white'
                }`}
              >
                {t('yes')}
              </button>
              <button
                type="button"
                onClick={() => setCustomFormData(prev => ({ ...prev, [fieldName]: false }))}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                  customFormData[fieldName] === false
                    ? 'bg-gray-600 border-gray-500 text-white shadow-lg'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white'
                }`}
              >
                {t('no')}
              </button>
            </div>
          </div>
        );

      case 'select':
        if (!field.options || field.options.length === 0) return null;

        if (field.selection_type === 'multiple') {
          return (
            <div key={field.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {label}{field.is_required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <p className="text-xs text-gray-500 italic">{t('select_options')}</p>
              <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 space-y-2">
                {field.options.map((option, idx) => {
                  const optionValue = option.label_en;
                  const isChecked = (customFormData[fieldName] || []).includes(optionValue);
                  return (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-indigo-600/20 border border-indigo-500/50'
                          : 'bg-gray-700 border border-transparent hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-indigo-500 cursor-pointer"
                        checked={isChecked}
                        onChange={(e) => handleMultiSelectChange(fieldName, optionValue, e.target.checked)}
                      />
                      <span className="text-gray-200 text-sm">{getOptionLabel(option)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        } else {
          return (
            <div key={field.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {label}{field.is_required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <p className="text-xs text-gray-500 italic">{t('select_option')}</p>
              <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 space-y-2">
                {field.options.map((option, idx) => {
                  const optionValue = option.label_en;
                  const isSelected = customFormData[fieldName] === optionValue;
                  return (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border border-indigo-500/50'
                          : 'bg-gray-700 border border-transparent hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        className="w-4 h-4 accent-indigo-500 cursor-pointer"
                        name={fieldName}
                        checked={isSelected}
                        onChange={() => handleSingleSelectChange(fieldName, optionValue)}
                        required={field.is_required}
                      />
                      <span className="text-gray-200 text-sm">{getOptionLabel(option)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }

      default:
        return (
          <div key={field.id} className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">
              {label}{field.is_required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <input
              type={field.field_type}
              id={field.id}
              name={fieldName}
              value={customFormData[fieldName] || ''}
              onChange={handleCustomInputChange}
              required={field.is_required}
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
            />
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => onClose(false)}
    >
      <div
        className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col registration-modal-container"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-xl p-5 flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <MdHowToReg size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg leading-tight">{t('registration_form')}</h3>
            <p className="text-indigo-100 text-xs mt-0.5">{t('fill_all_required_fields') || 'Remplissez tous les champs requis'}</p>
          </div>
          <button
            onClick={() => onClose(false)}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors flex-shrink-0"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto registration-modal-body p-5">

          {/* Success message */}
          {(registrationMessage || success) && (
            <div className="flex items-start gap-3 bg-green-900/30 border border-green-700 rounded-lg p-3.5 mb-4">
              <MdCheckCircle size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-green-300 text-sm font-medium">{registrationMessage}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-3 bg-red-900/30 border border-red-700 rounded-lg p-3.5 mb-4">
              <MdError size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleRegistration} className="space-y-4">

              {/* Champ Nom */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">
                  {t('full_name')} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MdPerson size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder={t('full_name_placeholder') || 'Jean Dupont'}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Champ Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">
                  {t('email')} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MdEmail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="exemple@email.com"
                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Champ Téléphone */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">
                  {t('phone')}
                </label>
                <div className="relative">
                  <MdPhone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (514) 000-0000"
                    className="w-full bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Séparateur si champs personnalisés */}
              {customFormFields.length > 0 && (
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-gray-800 px-3 text-xs text-gray-500">
                      {t('additional_information') || 'Informations supplémentaires'}
                    </span>
                  </div>
                </div>
              )}

              {/* Champs personnalisés */}
              {loading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-gray-400 text-sm">
                  <InlineSpinner size="sm" />
                  {t('loading_fields')}...
                </div>
              ) : (
                customFormFields.map(field => renderField(field))
              )}

              {/* Bouton soumettre */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                >
                  {loading ? (
                    <>
                      <InlineSpinner size="sm" />
                      {t('submitting')}
                    </>
                  ) : (
                    <>
                      <MdHowToReg size={20} />
                      {t('register')}
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default RegistrationModal;
