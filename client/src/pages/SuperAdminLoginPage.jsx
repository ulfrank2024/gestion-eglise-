import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo_eden.png'; // Importer le logo
import { InlineSpinner } from '../components/LoadingSpinner';

const SuperAdminLoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data.session) {
        // Pour un super admin, nous ne définissons pas de church_id dans le localStorage
        localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
        navigate('/super-admin/dashboard');
      } else {
        throw new Error('Login failed, no session data returned.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('login.error_invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex w-full max-w-4xl mx-auto overflow-hidden bg-gray-800 rounded-lg shadow-2xl border border-gray-700">
        {/* Colonne de gauche pour le logo */}
        <div className="flex items-center justify-center w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700">
          <div className="text-center">
            <img src={logo} alt="Logo" className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow-xl" />
            <p className="mt-4 text-white text-xl font-semibold">MY EDEN X</p>
            <p className="text-indigo-200 text-sm">Super Admin Portal</p>
          </div>
        </div>

        {/* Colonne de droite pour le formulaire */}
        <div className="w-1/2 p-8 bg-gray-800">
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            {t('super_admin_login.title')}
          </h2>
          <p className="text-center text-gray-400 mb-6">
            {t('super_admin_login.subtitle')}
          </p>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-300">
                {t('login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-2 mt-1 text-white bg-gray-700 placeholder-gray-400 border border-gray-600 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-300">
                {t('login.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 mt-1 text-white bg-gray-700 placeholder-gray-400 border border-gray-600 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            {error && <p className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded p-2">{error}</p>}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-md shadow-sm hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? <><InlineSpinner /> {t('login.logging_in')}</> : t('login.sign_in')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLoginPage;
