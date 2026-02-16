import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { getErrorMessage } from '../utils/errorHandler';
import defaultLogo from '../assets/logo_eden.png';
import {
  MdPerson, MdEmail, MdPhone, MdLock, MdCheck, MdClose,
  MdCake, MdLocationOn, MdLocationCity, MdImage
} from 'react-icons/md';
import { supabase } from '../supabaseClient';

function MemberRegistrationPage() {
  const { t, i18n } = useTranslation();
  const { churchId, token } = useParams();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [validationData, setValidationData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    date_of_birth: '',
    profilePhoto: null
  });
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profilePhoto: file });
      // Créer une preview de l'image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    validateAccess();
  }, [churchId, token, ref]);

  const validateAccess = async () => {
    try {
      setLoading(true);
      setError('');

      let data;
      if (token) {
        // Validation via token d'invitation
        data = await api.public.validateMemberInvitation(churchId, token);
        // Pré-remplir avec les données de l'invitation
        if (data.invitation) {
          setFormData(prev => ({
            ...prev,
            email: data.invitation.email || '',
            full_name: data.invitation.full_name || ''
          }));
        }
      } else if (ref) {
        // Validation via lien public
        data = await api.public.validatePublicRegistrationLink(churchId, ref);
      } else {
        throw new Error(t('invalid_registration_link') || 'Lien d\'inscription invalide');
      }

      setValidationData(data);
    } catch (err) {
      console.error('Validation error:', err);
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwords_dont_match') || 'Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError(t('password_too_short') || 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setSubmitting(true);

    try {
      let profilePhotoUrl = null;

      // Upload de la photo de profil si sélectionnée
      if (formData.profilePhoto) {
        const fileExt = formData.profilePhoto.name.split('.').pop();
        const fileName = `member-photos/${churchId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('event_images')
          .upload(fileName, formData.profilePhoto, {
            cacheControl: '3600',
            upsert: false
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('event_images')
            .getPublicUrl(fileName);
          profilePhotoUrl = publicUrl;
        }
      }

      await api.public.registerMember(churchId, {
        token,
        ref,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        address: formData.address,
        city: formData.city,
        date_of_birth: formData.date_of_birth,
        profile_photo_url: profilePhotoUrl
      });

      setSuccess(true);
    } catch (err) {
      console.error('Registration error:', err);
      setError(getErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-gray-300 text-lg">
          {t('loading')}...
        </div>
      </div>
    );
  }

  if (error && !validationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-8 max-w-md w-full text-center">
          <MdClose className="mx-auto text-5xl text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">
            {t('error') || 'Erreur'}
          </h2>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={() => navigate(`/${churchId}`)}
            className="mt-6 px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            {t('back_to_home') || 'Retour à l\'accueil'}
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto bg-green-600/20 rounded-full flex items-center justify-center mb-4">
            <MdCheck className="text-5xl text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">
            {t('registration_success') || 'Inscription réussie!'}
          </h2>
          <p className="text-gray-300 mb-6">
            {t('registration_success_message') || 'Votre compte a été créé. Vous pouvez maintenant vous connecter.'}
          </p>
          <button
            onClick={() => navigate('/member/login')}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all"
          >
            {t('go_to_login') || 'Se connecter'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center">
          <img
            src={validationData?.church?.logo_url || defaultLogo}
            alt={validationData?.church?.name || 'MY EDEN X'}
            className="w-20 h-20 mx-auto rounded-full object-cover border-4 border-white/20 mb-4"
          />
          <h1 className="text-2xl font-bold text-white">
            {t('join') || 'Rejoindre'} {validationData?.church?.name}
          </h1>
          <p className="text-indigo-100 mt-2">
            {t('create_member_account') || 'Créez votre compte membre'}
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400 flex items-center gap-2">
              <MdClose />
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdPerson className="text-gray-400" />
              {t('full_name')} *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('full_name_placeholder') || 'Jean Dupont'}
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdEmail className="text-gray-400" />
              {t('email')} *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="membre@email.com"
              required
              readOnly={!!token && !!validationData?.invitation?.email}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdPhone className="text-gray-400" />
              {t('phone') || 'Téléphone'}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="+1 234 567 890"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdCake className="text-gray-400" />
              {t('date_of_birth') || 'Date de naissance'}
            </label>
            <div className="flex gap-2">
              <select
                value={formData.date_of_birth ? formData.date_of_birth.split('-')[0] : ''}
                onChange={(e) => {
                  const day = formData.date_of_birth ? formData.date_of_birth.split('-')[1] : '';
                  setFormData({ ...formData, date_of_birth: e.target.value && day ? `${e.target.value}-${day}` : e.target.value ? `${e.target.value}-` : '' });
                }}
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t('month') || 'Mois'}</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                    {new Date(2000, i).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={formData.date_of_birth ? formData.date_of_birth.split('-')[1] : ''}
                onChange={(e) => {
                  const month = formData.date_of_birth ? formData.date_of_birth.split('-')[0] : '';
                  setFormData({ ...formData, date_of_birth: month && e.target.value ? `${month}-${e.target.value}` : '' });
                }}
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t('day') || 'Jour'}</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdLocationOn className="text-gray-400" />
              {t('address') || 'Adresse'}
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('address_placeholder') || '123 Rue Exemple'}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdLocationCity className="text-gray-400" />
              {t('city') || 'Ville'}
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('city_placeholder') || 'Montréal, QC'}
            />
          </div>

          {/* Photo de profil */}
          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdImage className="text-gray-400" />
              {t('profile_photo') || 'Photo de profil'}
            </label>
            <div className="flex items-center gap-4">
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
                <MdLock className="text-gray-400" />
                {t('password') || 'Mot de passe'} *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">
                {t('confirm_password') || 'Confirmer'} *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? t('creating_account') || 'Création du compte...'
              : t('create_account') || 'Créer mon compte'}
          </button>

          <p className="text-center text-gray-500 text-sm">
            {t('by_registering') || 'En vous inscrivant, vous acceptez les conditions d\'utilisation.'}
          </p>
        </form>
      </div>
    </div>
  );
}

export default MemberRegistrationPage;
