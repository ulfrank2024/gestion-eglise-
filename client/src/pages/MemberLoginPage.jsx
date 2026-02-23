import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import defaultLogo from '../assets/logo_eden.png';
import AlertMessage from '../components/AlertMessage';
import { getErrorMessage } from '../utils/errorHandler';
import { MdEmail, MdLock, MdLogin, MdChurch, MdArrowBack, MdChevronRight } from 'react-icons/md';
import InstallPWA from '../components/InstallPWA';
import { InlineSpinner } from '../components/LoadingSpinner';

function MemberLoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('login'); // 'login' | 'select_church'
  const [churches, setChurches] = useState([]);
  const [selectingChurch, setSelectingChurch] = useState(false);

  useEffect(() => {
    if (searchParams.get('blocked') === '1') {
      setError(t('account_blocked'));
    }
  }, []);

  const navigateByRole = (role) => {
    if (role === 'member') navigate('/member/dashboard');
    else if (role === 'church_admin') navigate('/admin/dashboard');
    else if (role === 'super_admin') navigate('/super-admin/dashboard');
    else setError(t('forbidden_access') || 'Accès non autorisé');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.auth.login({ email, password });

      // Supabase retourne session.access_token
      const token = response.session?.access_token || response.token;

      if (!token) {
        setError(t('error_login_failed') || 'Échec de la connexion');
        return;
      }

      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: token,
        user: response.user || response.session?.user
      }));

      // Récupérer toutes les églises de l'utilisateur
      const myChurches = await api.auth.myChurches();

      if (myChurches.length > 1) {
        // Multi-église → afficher le sélecteur
        setChurches(myChurches);
        setStep('select_church');
        setLoading(false);
        return;
      }

      // Une seule église → sélectionner automatiquement
      if (myChurches.length === 1) {
        localStorage.setItem('selected_church_id', myChurches[0].church_id);
      }

      const userInfo = await api.auth.me();
      navigateByRole(userInfo.church_role);
    } catch (err) {
      console.error('Login error:', err);
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChurch = async (churchId) => {
    setSelectingChurch(true);
    setError('');
    try {
      localStorage.setItem('selected_church_id', churchId);
      const userInfo = await api.auth.me();
      navigateByRole(userInfo.church_role);
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setSelectingChurch(false);
    }
  };

  const handleBackToLogin = () => {
    setStep('login');
    setChurches([]);
    localStorage.removeItem('selected_church_id');
    localStorage.removeItem('supabase.auth.token');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  // Rendu du sélecteur d'église (étape 2)
  if (step === 'select_church') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center">
            <img src={defaultLogo} alt="MY EDEN X" className="w-16 h-16 mx-auto rounded-full border-4 border-white/20 mb-3" />
            <h2 className="text-xl font-bold text-white">{t('select_church')}</h2>
            <p className="text-indigo-100 text-sm mt-1">{t('select_church_subtitle')}</p>
          </div>
          <div className="p-6 space-y-3">
            <AlertMessage type="error" message={error} onClose={() => setError('')} />
            {churches.map((c) => (
              <button
                key={c.church_id}
                onClick={() => handleSelectChurch(c.church_id)}
                disabled={selectingChurch}
                className="w-full flex items-center gap-4 p-4 bg-gray-700/60 hover:bg-gray-700 border border-gray-600 hover:border-indigo-500 rounded-xl transition-all text-left group disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-indigo-500/30 group-hover:border-indigo-400">
                  {c.church_logo ? (
                    <img src={c.church_logo} alt={c.church_name} className="w-full h-full object-cover" />
                  ) : (
                    <MdChurch className="text-indigo-400 text-2xl" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{c.church_name}</p>
                  {c.church_location && (
                    <p className="text-gray-400 text-xs truncate">{c.church_location}</p>
                  )}
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.role === 'church_admin'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {c.is_main_admin ? t('church_role_main_admin') :
                     c.role === 'church_admin' ? t('church_role_church_admin') :
                     t('church_role_member')}
                  </span>
                </div>
                <MdChevronRight className="text-gray-400 group-hover:text-indigo-400 text-xl flex-shrink-0" />
              </button>
            ))}
            <button
              onClick={handleBackToLogin}
              className="w-full flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-white transition-colors text-sm mt-2"
            >
              <MdArrowBack />
              {t('back_to_login')}
            </button>
          </div>
        </div>
        <InstallPWA />
      </div>
    );
  }

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
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
            {loading ? <><InlineSpinner /> {t('login.logging_in')}</> : t('login.sign_in')}
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

      {/* PWA Install Banner */}
      <InstallPWA />
    </div>
  );
}

export default MemberLoginPage;
