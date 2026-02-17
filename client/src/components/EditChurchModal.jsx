import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { MdEdit, MdClose, MdChurch, MdLocationOn, MdEmail, MdPhone, MdLocationCity, MdLink } from 'react-icons/md';
import { InlineSpinner } from './LoadingSpinner';

const EditChurchModal = ({ isOpen, onClose, onChurchUpdated, church }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (church) {
      setName(church.name || '');
      setSubdomain(church.subdomain || '');
      setLogoUrl(church.logo_url || '');
      setLocation(church.location || '');
      setCity(church.city || '');
      setContactEmail(church.contact_email || '');
      setContactPhone(church.contact_phone || '');
    }
  }, [church]);

  const handleUpdateChurch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updatedChurch = await api.superAdmin.updateChurch(church.id, {
        name,
        subdomain,
        logo_url: logoUrl,
        location,
        city,
        contact_email: contactEmail,
        contact_phone: contactPhone,
      });
      onChurchUpdated(updatedChurch);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update church.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div className="relative mx-auto w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <MdEdit className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('edit_church')}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
              type="button"
            >
              <MdClose className="text-2xl" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleUpdateChurch} className="p-6 space-y-4">
            {/* Nom de l'eglise */}
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300 mb-1">
                <MdChurch className="inline mr-1 text-indigo-400" />
                {t('super_admin_dashboard.church_name')}
              </label>
              <input
                type="text"
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="block w-full px-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Subdomain */}
            <div>
              <label htmlFor="edit-subdomain" className="block text-sm font-medium text-gray-300 mb-1">
                <MdLink className="inline mr-1 text-indigo-400" />
                {t('super_admin_dashboard.subdomain')}
              </label>
              <input
                type="text"
                id="edit-subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                required
                className="block w-full px-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Grille 2 colonnes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Localisation */}
              <div>
                <label htmlFor="edit-location" className="block text-sm font-medium text-gray-300 mb-1">
                  <MdLocationOn className="inline mr-1 text-indigo-400" />
                  {t('location') || 'Adresse'}
                </label>
                <input
                  type="text"
                  id="edit-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('address_placeholder') || '123 Rue Exemple'}
                  className="block w-full px-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Ville */}
              <div>
                <label htmlFor="edit-city" className="block text-sm font-medium text-gray-300 mb-1">
                  <MdLocationCity className="inline mr-1 text-indigo-400" />
                  {t('city') || 'Ville'}
                </label>
                <input
                  type="text"
                  id="edit-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('city_placeholder') || 'Montreal, QC'}
                  className="block w-full px-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Email de contact */}
              <div>
                <label htmlFor="edit-contact-email" className="block text-sm font-medium text-gray-300 mb-1">
                  <MdEmail className="inline mr-1 text-indigo-400" />
                  {t('contact_email') || 'Email de contact'}
                </label>
                <input
                  type="email"
                  id="edit-contact-email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@eglise.com"
                  className="block w-full px-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Telephone */}
              <div>
                <label htmlFor="edit-contact-phone" className="block text-sm font-medium text-gray-300 mb-1">
                  <MdPhone className="inline mr-1 text-indigo-400" />
                  {t('contact_phone') || 'Telephone'}
                </label>
                <input
                  type="tel"
                  id="edit-contact-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 514 000-0000"
                  className="block w-full px-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label htmlFor="edit-logoUrl" className="block text-sm font-medium text-gray-300 mb-1">
                {t('logo_url') || 'URL du logo'}
              </label>
              <input
                type="text"
                id="edit-logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="block w-full px-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-3 flex items-start space-x-2">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium border border-gray-600"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? <><InlineSpinner /> {t('updating')}</> : t('update')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditChurchModal;
