import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { MdChurch, MdPerson, MdEmail, MdPhone, MdLocationOn, MdLock, MdImage, MdSubdirectoryArrowRight, MdCameraAlt, MdCake, MdLocationCity } from 'react-icons/md';
import logo from '../assets/logo_eden.png';
import { InlineSpinner } from '../components/LoadingSpinner';

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
    adminPhone: '',
    adminAddress: '',
    adminCity: '',
    adminDateOfBirth: '',
    password: '',
    confirmPassword: '',
    logoFile: null,
    adminPhotoFile: null,
  });
  const [adminPhotoPreview, setAdminPhotoPreview] = useState(null);

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
    const { name } = e.target;
    const file = e.target.files[0];
    setFormState(prevState => ({ ...prevState, [name]: file }));

    // Preview pour la photo admin
    if (name === 'adminPhotoFile' && file) {
      const reader = new FileReader();
      reader.onloadend = () => setAdminPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation mot de passe
    if (formState.password !== formState.confirmPassword) {
      setError(t('password_mismatch') || 'Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    try {
      // Envoyer les fichiers via FormData au backend (bypass RLS)
      const formData = new FormData();
      formData.append('token', token);
      formData.append('churchName', formState.churchName);
      formData.append('subdomain', formState.subdomain);
      formData.append('location', formState.location || '');
      formData.append('city', formState.city || '');
      formData.append('email', formState.email);
      formData.append('phone', formState.phone || '');
      formData.append('adminName', formState.adminName);
      formData.append('adminPhone', formState.adminPhone || '');
      formData.append('adminAddress', formState.adminAddress || '');
      formData.append('adminCity', formState.adminCity || '');
      formData.append('adminDateOfBirth', formState.adminDateOfBirth || '');
      formData.append('password', formState.password);

      if (formState.logoFile) {
        formData.append('logoFile', formState.logoFile);
      }
      if (formState.adminPhotoFile) {
        formData.append('adminPhotoFile', formState.adminPhotoFile);
      }

      await api.public.registerChurch(formData);

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

            {/* Photo de profil admin - centrée en haut */}
            <div className="flex justify-center mb-6">
              <div className="text-center">
                <div className="relative inline-block">
                  {adminPhotoPreview ? (
                    <img
                      src={adminPhotoPreview}
                      alt="Admin photo"
                      className="w-24 h-24 rounded-full object-cover border-4 border-purple-500/30"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center border-4 border-purple-500/30">
                      <MdPerson className="text-4xl text-gray-400" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors">
                    <MdCameraAlt className="text-white text-sm" />
                    <input
                      type="file"
                      name="adminPhotoFile"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-gray-400 text-xs mt-2">{t('church_registration.admin_photo') || 'Photo de profil'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Admin Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('church_registration.admin_name')} *
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
                    placeholder="Nom complet"
                  />
                </div>
              </div>

              {/* Admin Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('phone') || 'Téléphone'}
                </label>
                <div className="relative">
                  <MdPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="adminPhone"
                    value={formState.adminPhone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="+1 514 000 0000"
                  />
                </div>
              </div>

              {/* Admin Address */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('address') || 'Adresse'}
                </label>
                <div className="relative">
                  <MdLocationOn className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="adminAddress"
                    value={formState.adminAddress}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="123 Rue Exemple"
                  />
                </div>
              </div>

              {/* Admin City */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('city') || 'Ville'}
                </label>
                <div className="relative">
                  <MdLocationCity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="adminCity"
                    value={formState.adminCity}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Montréal, QC"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('date_of_birth') || 'Date de naissance (Mois-Jour)'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MdCake className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      value={(formState.adminDateOfBirth || '').split('-')[0] || ''}
                      onChange={(e) => {
                        const day = (formState.adminDateOfBirth || '').split('-')[1] || '';
                        handleChange({ target: { name: 'adminDateOfBirth', value: e.target.value && day ? `${e.target.value}-${day}` : e.target.value || '' } });
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">{t('month') || 'Mois'}</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                          {new Date(2000, i).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <select
                    value={(formState.adminDateOfBirth || '').split('-')[1] || ''}
                    onChange={(e) => {
                      const month = (formState.adminDateOfBirth || '').split('-')[0] || '';
                      handleChange({ target: { name: 'adminDateOfBirth', value: month && e.target.value ? `${month}-${e.target.value}` : '' } });
                    }}
                    className="flex-1 px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{t('day') || 'Jour'}</option>
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('church_registration.password')} *
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

              {/* Confirm Password */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('confirm_password') || 'Confirmer le mot de passe'} *
                </label>
                <div className="relative">
                  <MdLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formState.confirmPassword}
                    onChange={handleChange}
                    required
                    className={`w-full pl-10 pr-4 py-3 bg-gray-700 text-white placeholder-gray-400 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      formState.confirmPassword && formState.password !== formState.confirmPassword
                        ? 'border-red-500'
                        : 'border-gray-600'
                    }`}
                    placeholder="Confirmer le mot de passe"
                  />
                  {formState.confirmPassword && formState.password !== formState.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">{t('password_mismatch') || 'Les mots de passe ne correspondent pas'}</p>
                  )}
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
            {loading ? <><InlineSpinner /> {t('submitting')}</> : t('submit_registration')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChurchRegistrationPage;
