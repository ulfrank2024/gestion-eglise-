import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  MdSettings, MdChurch, MdEmail, MdPhone, MdLocationOn, MdLocationCity,
  MdImage, MdLock, MdSave, MdVisibility, MdVisibilityOff
} from 'react-icons/md';
import AlertMessage from '../components/AlertMessage';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/errorHandler';

function AdminChurchSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Church settings state
  const [churchSettings, setChurchSettings] = useState({
    name: '',
    subdomain: '',
    logo_url: '',
    location: '',
    city: '',
    contact_email: '',
    contact_phone: '',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState(null);

  // Messages d'erreur (les succès utilisent les toasts)
  const [churchError, setChurchError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Submitting states
  const [savingChurch, setSavingChurch] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);

        const userInfo = await api.auth.me();
        const currentChurchId = userInfo.church_id;

        // Vérifier si l'utilisateur est l'admin principal
        if (!userInfo.is_main_admin) {
          // Rediriger vers le dashboard si pas admin principal
          navigate('/admin/dashboard');
          return;
        }

        if (!currentChurchId) {
          setChurchError(t('error_loading_user_data'));
          setLoading(false);
          return;
        }
        setChurchId(currentChurchId);

        // Fetch church settings
        const churchData = await api.admin.getChurchDetails(currentChurchId);
        console.log('=== Church data received ===', churchData);
        setChurchSettings({
          name: churchData.name || '',
          subdomain: churchData.subdomain || '',
          logo_url: churchData.logo_url || '',
          location: churchData.location || '',
          city: churchData.city || '',
          contact_email: churchData.contact_email || '',
          contact_phone: churchData.contact_phone || '',
        });

      } catch (err) {
        console.error('Error fetching settings:', err);
        setChurchError(getErrorMessage(err, t));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [t, navigate]);

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    setChurchError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `church-logos/church-${churchId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('event_images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event_images')
        .getPublicUrl(fileName);

      setChurchSettings(prev => ({ ...prev, logo_url: publicUrl }));
    } catch (err) {
      console.error('Logo upload error:', err);
      setChurchError(getErrorMessage(err, t));
      showError(getErrorMessage(err, t));
    } finally {
      setUploadingLogo(false);
    }
  };

  // Save church settings
  const handleChurchSubmit = async (e) => {
    e.preventDefault();
    setSavingChurch(true);
    setChurchError('');

    try {
      await api.admin.updateChurchSettings(churchId, churchSettings);
      showSuccess(t('church_settings_updated_successfully'));
    } catch (err) {
      console.error('Error updating church settings:', err);
      const errorMsg = getErrorMessage(err, t);
      setChurchError(errorMsg);
      showError(errorMsg);
    } finally {
      setSavingChurch(false);
    }
  };

  // Change password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordError('');

    // Validate passwords match
    if (passwordData.new_password !== passwordData.confirm_password) {
      const errorMsg = t('error_passwords_dont_match');
      setPasswordError(errorMsg);
      showError(errorMsg);
      setSavingPassword(false);
      return;
    }

    // Validate password length
    if (passwordData.new_password.length < 6) {
      const errorMsg = t('error_password_too_short');
      setPasswordError(errorMsg);
      showError(errorMsg);
      setSavingPassword(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (error) throw error;

      showSuccess(t('password_changed_success'));
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      console.error('Error changing password:', err);
      const errorMsg = getErrorMessage(err, t);
      setPasswordError(errorMsg);
      showError(errorMsg);
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-300">{t('loading')}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MdSettings className="text-3xl text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">{t('church_settings')}</h1>
      </div>

      {/* Church Settings Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MdChurch />
            {t('church_information') || 'Informations de l\'église'}
          </h2>
        </div>

        <form onSubmit={handleChurchSubmit} className="p-5 space-y-4">
          {/* Logo */}
          <div>
            <label className="block text-gray-300 text-sm mb-2 flex items-center gap-2">
              <MdImage className="text-gray-400" />
              Logo
            </label>
            <div className="flex items-center gap-4">
              {churchSettings.logo_url && (
                <img
                  src={churchSettings.logo_url}
                  alt="Church logo"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                />
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="block w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-indigo-600 file:text-white
                    hover:file:bg-indigo-700
                    file:cursor-pointer file:transition-colors
                    disabled:opacity-50"
                />
                {uploadingLogo && <p className="text-xs text-gray-500 mt-1">{t('loading')}...</p>}
              </div>
            </div>
          </div>

          {/* Name & Subdomain */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">
                {t('super_admin_dashboard.church_name')} *
              </label>
              <input
                type="text"
                value={churchSettings.name}
                onChange={(e) => setChurchSettings(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">
                {t('super_admin_dashboard.subdomain')}
              </label>
              <input
                type="text"
                value={churchSettings.subdomain}
                onChange={(e) => setChurchSettings(prev => ({ ...prev, subdomain: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Location & City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
                <MdLocationOn className="text-gray-400" />
                {t('address') || 'Adresse'}
              </label>
              <input
                type="text"
                value={churchSettings.location}
                onChange={(e) => setChurchSettings(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="123 Rue de l'Église"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
                <MdLocationCity className="text-gray-400" />
                {t('city') || 'Ville'}
              </label>
              <input
                type="text"
                value={churchSettings.city}
                onChange={(e) => setChurchSettings(prev => ({ ...prev, city: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Montréal, QC"
              />
            </div>
          </div>

          {/* Contact Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
                <MdEmail className="text-gray-400" />
                {t('super_admin_dashboard.email')}
              </label>
              <input
                type="email"
                value={churchSettings.contact_email}
                onChange={(e) => setChurchSettings(prev => ({ ...prev, contact_email: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="contact@eglise.com"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
                <MdPhone className="text-gray-400" />
                {t('super_admin_dashboard.phone')}
              </label>
              <input
                type="tel"
                value={churchSettings.contact_phone}
                onChange={(e) => setChurchSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+1 234 567 890"
              />
            </div>
          </div>

          {/* Message d'erreur */}
          <AlertMessage
            type="error"
            message={churchError}
            onClose={() => setChurchError('')}
          />

          <button
            type="submit"
            disabled={savingChurch}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            <MdSave />
            {savingChurch ? t('saving') : t('save')}
          </button>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MdLock />
            {t('change_password')}
          </h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-gray-300 text-sm mb-1">
              {t('new_password')}
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPasswords.new ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-gray-300 text-sm mb-1">
              {t('confirm_new_password')}
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPasswords.confirm ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
          </div>

          {/* Message d'erreur */}
          <AlertMessage
            type="error"
            message={passwordError}
            onClose={() => setPasswordError('')}
          />

          <button
            type="submit"
            disabled={savingPassword}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50"
          >
            <MdLock />
            {savingPassword ? t('saving') : t('change_password')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminChurchSettingsPage;
