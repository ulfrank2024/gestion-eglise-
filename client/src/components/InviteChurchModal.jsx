import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { MdEmail, MdClose } from 'react-icons/md';

const InviteChurchModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.superAdmin.inviteChurch(email);
      setSuccess(t('super_admin_dashboard.invitation_sent_success'));
      setTimeout(() => {
        onClose();
        setSuccess('');
        setEmail('');
      }, 2000);
    } catch (err) {
      console.error('Error inviting church:', err);
      setError(err.response?.data?.error || err.message || t('super_admin_dashboard.invitation_sent_error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="relative mx-auto w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <MdEmail className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('invite_new_church')}</h3>
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {t('super_admin_dashboard.admin_email')}
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="block w-full px-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-3 flex items-start space-x-2">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-900 bg-opacity-30 border border-green-700 rounded-lg p-3 flex items-start space-x-2">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-300 text-sm">{success}</p>
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
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('sending_invitation') : t('send_invitation')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteChurchModal;
