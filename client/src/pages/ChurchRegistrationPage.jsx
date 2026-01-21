import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { supabase } from '../supabaseClient';
import { MdChurch, MdPerson, MdEmail, MdPhone, MdLocationOn, MdLock, MdImage, MdSubdirectoryArrowRight } from 'react-icons/md';
import logo from '../assets/logo_eden.png';

const ChurchRegistrationPage = () => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };
  const { token } = useParams();
  const navigate = useNavigate();

  const [formState, setFormState] = useState({
    churchName: '',
    subdomain: '',
    location: '',
    city: '',
    email: '',
    phone: '',
    adminName: '',
    password: '',
    logoFile: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      // Pour l'instant, on suppose que le token est valide.
      // Dans une vraie application, il faudrait une route API pour vérifier le token.
      // Par exemple: await api.public.verifyInvitationToken({ token });
      if (!token) {
        setTokenError('Token d\'invitation invalide ou manquant.');
      }
    };
    verifyToken();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFormState(prevState => ({
      ...prevState,
      logoFile: e.target.files[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let logoUrl = null;

      // Upload du logo vers Supabase Storage si un fichier est sélectionné
      // Utilise le bucket 'event_images' qui existe déjà
      if (formState.logoFile) {
        const fileExt = formState.logoFile.name.split('.').pop();
        const fileName = `church-logos/${formState.subdomain}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('event_images')
          .upload(fileName, formState.logoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Logo upload error:', uploadError);
          // Ne pas bloquer l'inscription si l'upload échoue, juste logger l'erreur
        } else {
          // Récupérer l'URL publique du logo
          const { data: { publicUrl } } = supabase.storage
            .from('event_images')
            .getPublicUrl(fileName);
          logoUrl = publicUrl;
        }
      }

      // Construire l'objet de données à envoyer
      const registrationData = {
        token,
        churchName: formState.churchName,
        subdomain: formState.subdomain,
        location: formState.location,
        city: formState.city,
        email: formState.email,
        phone: formState.phone,
        adminName: formState.adminName,
        password: formState.password,
        logoUrl: logoUrl,
      };

      await api.public.registerChurch(registrationData);

      setSuccess(t('church_registration.success_message') || 'Inscription réussie ! Vous allez être redirigé vers la page de connexion.');
      setTimeout(() => {
        navigate('/admin/login');
      }, 3000);

    } catch (err) {
      console.error('Church registration error:', err);
      setError(err.response?.data?.error || err.message || t('church_registration.error_message') || 'Une erreur est survenue lors de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-6 max-w-md">
          <p className="text-red-300 text-center">{tokenError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Logo et Titre */}
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <img src={logo} alt="Logo" className="w-16 h-16 rounded-full border-4 border-white shadow-xl mx-auto" />
                <p className="text-white text-sm font-bold mt-2">MY EDEN X</p>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">{t('church_registration.title')}</h2>
                <p className="text-indigo-100 text-sm mt-1">{t('church_registration.subtitle') || 'Complétez les informations ci-dessous'}</p>
              </div>
            </div>

            {/* Sélecteur de langue */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleLanguageChange('fr')}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                  i18n.language === 'fr'
                    ? 'bg-white text-indigo-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                  i18n.language === 'en'
                    ? 'bg-white text-indigo-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8">
          {/* Section Informations Église */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <MdChurch className="text-indigo-400 text-2xl" />
              <h3 className="text-xl font-bold text-white">{t('church_registration.church_info')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Church Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('church_registration.church_name')}
                </label>
                <div className="relative">
                  <MdChurch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="churchName"
                    value={formState.churchName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Nom de l'église"
                  />
                </div>
              </div>

              {/* Subdomain */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('church_registration.subdomain')}
                </label>
                <div className="relative">
                  <MdSubdirectoryArrowRight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="subdomain"
                    value={formState.subdomain}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="mon-eglise"
                  />
                </div>
              </div>

              {/* Location (Address) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('church_registration.address')}
                </label>
                <div className="relative">
                  <MdLocationOn className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="location"
                    value={formState.location}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="123 Rue de l'Église"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('church_registration.city')}
                </label>
                <div className="relative">
                  <MdLocationOn className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="city"
                    value={formState.city}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Montréal, QC"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('church_registration.contact_email')}
                </label>
                <div className="relative">
                  <MdEmail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formState.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="contact@eglise.com"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('church_registration.phone')}
                </label>
                <div className="relative">
                  <MdPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formState.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
              </div>

              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <MdImage className="inline mr-2" />
                  {t('church_registration.logo')}
                </label>
                <input
                  type="file"
                  name="logoFile"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="w-full px-4 py-3 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section Informations Administrateur */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <MdPerson className="text-purple-400 text-2xl" />
              <h3 className="text-xl font-bold text-white">{t('church_registration.admin_info')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Admin Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('church_registration.admin_name')}
                </label>
                <div className="relative">
                  <MdPerson className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="adminName"
                    value={formState.adminName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Nom complet de l'administrateur"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('church_registration.password')}
                </label>
                <div className="relative">
                  <MdLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formState.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Mot de passe sécurisé"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 flex items-start space-x-2">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg p-4 flex items-start space-x-2">
              <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-300 text-sm">{success}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('submitting') : t('submit_registration')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChurchRegistrationPage;
