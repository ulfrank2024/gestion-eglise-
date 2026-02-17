import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import logo from '../assets/logo_eden.png';
import AlertMessage from '../components/AlertMessage';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/errorHandler';
import { MdLock, MdVisibility, MdVisibilityOff, MdCheckCircle } from 'react-icons/md';
import { InlineSpinner } from '../components/LoadingSpinner';

function ResetPasswordPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Récupérer les paramètres de l'URL
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Déterminer si c'est admin ou membre basé sur l'URL
  const isAdmin = location.pathname.includes('/admin/');
  const loginPath = isAdmin ? '/admin/login' : '/member/login';

  useEffect(() => {
    // Vérifier que les paramètres sont présents
    if (!token || !email) {
      setError(t('reset_password.invalid_link'));
    }
  }, [token, email, t]);

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (newPassword !== confirmPassword) {
      setError(t('error_passwords_dont_match'));
      showError(t('error_passwords_dont_match'));
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError(t('error_password_too_short'));
      showError(t('error_password_too_short'));
      setLoading(false);
      return;
    }

    try {
      await api.auth.resetPassword({
        email,
        token,
        newPassword
      });

      setSuccess(true);
      showSuccess(t('reset_password.success_message'));

      // Rediriger vers la page de connexion après 3 secondes
      setTimeout(() => {
        navigate(loginPath);
      }, 3000);

    } catch (err) {
      console.error('Reset password error:', err);
      const errorMsg = getErrorMessage(err, t);
      setError(errorMsg);
      showError(errorMsg);
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
            <p className="text-indigo-200 text-sm mt-1">{t('reset_password.title')}</p>
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
                  <MdCheckCircle className="text-4xl text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {t('reset_password.success_title')}
                </h3>
                <p className="text-gray-400 mb-2">
                  {t('reset_password.success_message')}
                </p>
                <p className="text-gray-500 text-sm">
                  {t('reset_password.redirecting')}
                </p>
              </div>
            ) : !token || !email ? (
              /* Lien invalide */
              <div className="text-center">
                <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MdLock className="text-3xl text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {t('reset_password.invalid_link_title')}
                </h3>
                <p className="text-gray-400 mb-6">
                  {t('reset_password.invalid_link')}
                </p>
                <button
                  onClick={() => navigate(isAdmin ? '/admin/forgot-password' : '/member/forgot-password')}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t('reset_password.request_new_link')}
                </button>
              </div>
            ) : (
              /* Formulaire */
              <form onSubmit={handleSubmit} className="space-y-6">
                <p className="text-gray-400 text-sm text-center mb-6">
                  {t('reset_password.instruction')}
                </p>

                <AlertMessage
                  type="error"
                  message={error}
                  onClose={() => setError('')}
                />

                {/* Nouveau mot de passe */}
                <div>
                  <label htmlFor="newPassword" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <MdLock className="text-gray-400" />
                    {t('reset_password.new_password')}
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full px-4 py-3 pr-12 text-white bg-gray-700 placeholder-gray-400 border border-gray-600 rounded-lg shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showNewPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('reset_password.password_hint')}
                  </p>
                </div>

                {/* Confirmer mot de passe */}
                <div>
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <MdLock className="text-gray-400" />
                    {t('reset_password.confirm_password')}
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full px-4 py-3 pr-12 text-white bg-gray-700 placeholder-gray-400 border border-gray-600 rounded-lg shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex justify-center items-center gap-2 w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-lg shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <MdLock />
                  {loading ? <><InlineSpinner /> {t('saving')}</> : t('reset_password.submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
