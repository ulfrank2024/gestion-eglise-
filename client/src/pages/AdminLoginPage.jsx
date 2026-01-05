import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo_eden.jpg';
import './AdminLoginPage.css'; // Importer le fichier CSS

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
      localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
      navigate('/admin/dashboard');
    } catch (error) {
      setError(error.message);
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pageStyle">
      <h1 className="mainTitle">{t('event_management_system')}</h1>
      <div className="formContainerStyle">
        <img src={logo} alt="Logo" className="logoStyle" />
        <div className="langSelectorContainer">
          <h2 className="adminLoginTitle">{t('admin_login')}</h2>
          <button onClick={() => handleLanguageChange('fr')} className="langButtonStyle" style={{ fontWeight: i18n.language === 'fr' ? 'bold' : 'normal' }}>FR</button>
          <button onClick={() => handleLanguageChange('en')} className="langButtonStyle" style={{ fontWeight: i18n.language === 'en' ? 'bold' : 'normal' }}>EN</button>
        </div>
        {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <input
            type="email"
            id="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('email')}
            required
            className="inputStyle"
          />
          <input
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('password')}
            required
            className="inputStyle"
          />
          <button type="submit" disabled={loading} className="buttonStyle">
            {loading ? 'Logging in...' : t('login')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLoginPage;