import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import defaultLogo from '../assets/logo_eden.png';
import AlertMessage from '../components/AlertMessage';
import { getErrorMessage } from '../utils/errorHandler';
import { MdEmail, MdLock, MdLogin } from 'react-icons/md';

function MemberLoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.auth.login({ email, password });

      // Supabase retourne session.access_token
      const token = response.session?.access_token || response.token;

      if (token) {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: token,
          user: response.user || response.session?.user
        }));

        // Vérifier le rôle de l'utilisateur
        const userInfo = await api.auth.me();

        if (userInfo.church_role === 'member') {
          navigate('/member/dashboard');
        } else if (userInfo.church_role === 'church_admin') {
          navigate('/admin/dashboard');
        } else if (userInfo.church_role === 'super_admin') {
          navigate('/super-admin/dashboard');
        } else {
          setError(t('forbidden_access') || 'Accès non autorisé');
        }
      } else {
        setError(t('error_login_failed') || 'Échec de la connexion');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center">
          <img
            src={defaultLogo}
            alt="MY EDEN X"
            className="w-20 h-20 mx-auto rounded-full border-4 border-white/20"
          />
          <h1 className="text-2xl font-bold text-white mt-4">MY EDEN X</h1>
          <p className="text-indigo-100 mt-1">{t('member_dashboard')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <AlertMessage
            type="error"
            message={error}
            onClose={() => setError('')}
          />

          {/* Email */}
          <div>
            <label className="block text-gray-300 text-sm mb-2 flex items-center gap-2">
              <MdEmail className="text-gray-400" />
              {t('login.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="membre@email.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-300 text-sm mb-2 flex items-center gap-2">
              <MdLock className="text-gray-400" />
              {t('login.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
            <div className="mt-2 text-right">
              <Link
                to="/member/forgot-password"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {t('forgot_password.title')} ?
              </Link>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdLogin size={20} />
            {loading ? t('login.logging_in') : t('login.sign_in')}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 pb-6">
          {/* Language Switcher */}
          <div className="flex justify-center gap-2 pt-4 border-t border-gray-700">
            <button
              onClick={() => changeLanguage('fr')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                i18n.language === 'fr'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Français
            </button>
            <button
              onClick={() => changeLanguage('en')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                i18n.language === 'en'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MemberLoginPage;
