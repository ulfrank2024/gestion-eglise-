import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import logo from '../assets/logo_eden.png';
import { MdAdminPanelSettings, MdPerson, MdChurch } from 'react-icons/md';
import InstallPWA from '../components/InstallPWA';

function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('supabase.auth.token');
        if (token) {
          const userInfo = await api.auth.me();

          // Rediriger vers le bon dashboard selon le rôle
          if (userInfo.church_role === 'super_admin') {
            navigate('/super-admin/dashboard');
            return;
          } else if (userInfo.church_role === 'church_admin') {
            navigate('/admin/dashboard');
            return;
          } else if (userInfo.church_role === 'member') {
            navigate('/member/dashboard');
            return;
          }
        }
      } catch (err) {
        // Pas connecté ou token invalide, afficher la page d'accueil
        console.log('Not authenticated, showing home page');
      }
      setChecking(false);
    };

    checkAuth();
  }, [navigate]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-gray-300 text-lg">{t('loading')}...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Logo et titre */}
      <div className="text-center mb-8">
        <img
          src={logo}
          alt="MY EDEN X"
          className="w-24 h-24 mx-auto rounded-full border-4 border-indigo-500 shadow-lg mb-4"
        />
        <h1 className="text-3xl font-bold text-white mb-2">MY EDEN X</h1>
        <p className="text-gray-400">{t('church_management_platform')}</p>
      </div>

      {/* Boutons de connexion */}
      <div className="w-full max-w-sm space-y-4">
        {/* Bouton Admin */}
        <button
          onClick={() => navigate('/admin/login')}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          <MdAdminPanelSettings size={24} />
          <span>{t('admin_login') || 'Connexion Admin'}</span>
        </button>

        {/* Bouton Membre */}
        <button
          onClick={() => navigate('/member/login')}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:from-green-700 hover:to-teal-700 transition-all"
        >
          <MdPerson size={24} />
          <span>{t('member_login') || 'Connexion Membre'}</span>
        </button>

        {/* Séparateur */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-700"></div>
          <span className="text-gray-500 text-sm">ou</span>
          <div className="flex-1 h-px bg-gray-700"></div>
        </div>

        {/* Bouton page publique église */}
        <button
          onClick={() => {
            const churchId = prompt(t('enter_church_id') || 'Entrez l\'identifiant de l\'église:');
            if (churchId) {
              navigate(`/${churchId}`);
            }
          }}
          className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-gray-700 text-gray-300 font-medium rounded-xl border border-gray-600 hover:bg-gray-600 hover:text-white transition-all"
        >
          <MdChurch size={20} />
          <span>{t('visit_church_page') || 'Visiter une page d\'église'}</span>
        </button>
      </div>

      {/* Sélecteur de langue */}
      <div className="flex justify-center gap-2 mt-8">
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

      {/* Verset biblique */}
      <p className="text-gray-500 text-sm text-center mt-8 max-w-md italic">
        {t('bible_verse')}
      </p>

      {/* PWA Install Button */}
      <InstallPWA />
    </div>
  );
}

export default HomePage;
