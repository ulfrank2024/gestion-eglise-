import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import logo from '../assets/logo_eden.png';
import AlertMessage from '../components/AlertMessage';
import { getErrorMessage } from '../utils/errorHandler';
import { MdEmail, MdArrowBack, MdSend } from 'react-icons/md';
import { InlineSpinner } from '../components/LoadingSpinner';

function AdminForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await api.auth.forgotPassword({
        email,
        userType: 'admin',
        language: i18n.language
      });
      setSuccess(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md mx-auto p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
          {/* Header avec logo */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-center">
            <img
              src={logo}
              alt="Logo"
              className="w-20 h-20 rounded-full mx-auto border-4 border-white/20 shadow-xl"
            />
            <p className="mt-3 text-white text-lg font-semibold">MY EDEN X</p>
            <p className="text-indigo-200 text-sm mt-1">{t('forgot_password.title')}</p>
          </div>

          {/* Contenu */}
          <div className="p-8">
            {/* Sélecteur de langue */}
            <div className="flex justify-end mb-6">
              <button
                onClick={() => handleLanguageChange('fr')}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all mr-2 ${
                  i18n.language === 'fr'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                FR
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                  i18n.language === 'en'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                EN
              </button>
            </div>

            {success ? (
              /* Message de succès */
              <div className="text-center">
                <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MdEmail className="text-3xl text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {t('forgot_password.email_sent_title')}
                </h3>
                <p className="text-gray-400 mb-6">
                  {t('forgot_password.email_sent_message')}
                </p>
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <MdArrowBack />
                  {t('forgot_password.back_to_login')}
                </Link>
              </div>
            ) : (
              /* Formulaire */
              <form onSubmit={handleSubmit} className="space-y-6">
                <p className="text-gray-400 text-sm text-center mb-6">
                  {t('forgot_password.instruction')}
                </p>

                <AlertMessage
                  type="error"
                  message={error}
                  onClose={() => setError('')}
                />

                <div>
                  <label htmlFor="email" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <MdEmail className="text-gray-400" />
                    {t('email')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-3 mt-2 text-white bg-gray-700 placeholder-gray-400 border border-gray-600 rounded-lg shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={t('email')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex justify-center items-center gap-2 w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-lg shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <MdSend />
                  {loading ? <><InlineSpinner /> {t('sending')}</> : t('forgot_password.send_link')}
                </button>

                <div className="text-center pt-4 border-t border-gray-700">
                  <Link
                    to="/admin/login"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors text-sm"
                  >
                    <MdArrowBack />
                    {t('forgot_password.back_to_login')}
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminForgotPasswordPage;
