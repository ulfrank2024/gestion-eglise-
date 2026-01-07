import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import './ConfirmationModal.css'; // Reuse some styles

const CreateChurchModal = ({ isOpen, onClose, onChurchCreated }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateChurch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const newChurch = await api.superAdmin.createChurch({
        name,
        subdomain,
        logo_url: logoUrl,
      });
      onChurchCreated(newChurch);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create church.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">{t('create_new_church')}</h3>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleCreateChurch}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              {t('super_admin_dashboard.church_name')}
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700">
              {t('super_admin_dashboard.subdomain')}
            </label>
            <input
              type="text"
              id="subdomain"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">
              {t('logo_url')}
            </label>
            <input
              type="text"
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {loading ? t('creating') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChurchModal;
