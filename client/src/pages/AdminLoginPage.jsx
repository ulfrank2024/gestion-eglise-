import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';
import { api } from '../api/api';
import logo from '../assets/logo_eden.png';
import AlertMessage from '../components/AlertMessage';
import { getErrorMessage } from '../utils/errorHandler';
import InstallPWA from '../components/InstallPWA';

function AdminLoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Stocker le token
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: data.session.access_token,
        user: data.user
      }));

      // Vérifier le rôle de l'utilisateur et rediriger vers le bon dashboard
      const userInfo = await api.auth.me();

      if (userInfo.church_role === 'super_admin') {
        navigate('/super-admin/dashboard');
      } else if (userInfo.church_role === 'church_admin') {
        navigate('/admin/dashboard');
      } else if (userInfo.church_role === 'member') {
        navigate('/member/dashboard');
      } else {
        setError(t('forbidden_access') || 'Accès non autorisé');
      }
    } catch (err) {
      setError(getErrorMessage(err, t));
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex w-full max-w-4xl mx-auto overflow-hidden bg-gray-800 rounded-lg shadow-2xl border border-gray-700">
        {/* Colonne de gauche pour le logo */}
        <div className="hidden md:flex items-center justify-center w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700">
          <div className="text-center">
            <img src={logo} alt="Logo" className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow-xl" />
            <p className="mt-4 text-white text-xl font-semibold">MY EDEN X</p>
            <p className="text-indigo-200 text-sm">{t('church_management_platform')}</p>
          </div>
        </div>

        {/* Colonne de droite pour le formulaire */}
        <div className="w-full md:w-1/2 p-8 bg-gray-800">
          {/* Logo mobile */}
          <div className="md:hidden text-center mb-6">
            <img src={logo} alt="Logo" className="w-20 h-20 rounded-full mx-auto border-4 border-indigo-500 shadow-xl" />
            <p className="mt-2 text-white text-lg font-semibold">MY EDEN X</p>
          </div>

          {/* Sélecteur de langue */}
          <div className="flex justify-end mb-4">
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

          <h2 className="text-2xl font-bold text-center text-white mb-2">
            {t('admin_login')}
          </h2>
          <p className="text-center text-gray-400 mb-6">
            {t('login.subtitle') || 'Connectez-vous à votre espace église'}
          </p>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-300">
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
                className="block w-full px-3 py-3 mt-1 text-white bg-gray-700 placeholder-gray-400 border border-gray-600 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm"
                placeholder={t('email')}
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-300">
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-3 mt-1 text-white bg-gray-700 placeholder-gray-400 border border-gray-600 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm"
                placeholder={t('password')}
              />
              <div className="mt-2 text-right">
                <Link
                  to="/admin/forgot-password"
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {t('forgot_password.title')} ?
                </Link>
              </div>
            </div>
            <AlertMessage
              type="error"
              message={error}
              onClose={() => setError('')}
            />
            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-md shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? t('login.logging_in') : t('login.sign_in')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PWA Install Banner */}
      <InstallPWA />
    </div>
  );
}

export default AdminLoginPage;
