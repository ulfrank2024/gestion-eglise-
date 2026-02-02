import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/api';
import { supabase } from '../supabaseClient';
import {
  MdPerson, MdEmail, MdPhone, MdLocationOn, MdCake,
  MdEdit, MdSave, MdClose, MdCheck, MdCameraAlt
} from 'react-icons/md';

function MemberProfilePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { memberInfo, churchInfo } = useOutletContext();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    profile_photo_url: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.member.getProfile();
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        address: data.address || '',
        date_of_birth: data.date_of_birth || '',
        profile_photo_url: data.profile_photo_url || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `member-photos/member-${profile.id}-${Date.now()}.${fileExt}`;

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

      // Update formData with new photo URL
      setFormData(prev => ({ ...prev, profile_photo_url: publicUrl }));

      // Save immediately if not in edit mode
      if (!editing) {
        await api.member.updateProfile({ profile_photo_url: publicUrl });
        setProfile(prev => ({ ...prev, profile_photo_url: publicUrl }));
        setSuccess(t('profile_updated_success'));
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      setError(t('error_uploading_image') || 'Erreur lors du téléchargement de la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.member.updateProfile(formData);
      setSuccess(t('profile_updated_success'));
      setEditing(false);
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      address: profile.address || '',
      date_of_birth: profile.date_of_birth || '',
      profile_photo_url: profile.profile_photo_url || ''
    });
    setEditing(false);
    setError('');
  };

  if (loading) {
    return <div className="text-gray-300">{t('loading')}...</div>;
  }

  const photoUrl = formData.profile_photo_url || profile?.profile_photo_url;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <MdPerson className="text-indigo-400" />
          {t('my_profile')}
        </h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <MdEdit size={18} />
            {t('edit')}
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400 flex items-center gap-2">
          <MdClose />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-400 flex items-center gap-2">
          <MdCheck />
          {success}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {/* Header with avatar */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="flex items-center gap-4">
            {/* Photo Upload */}
            <div className="relative group">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={profile?.full_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white/20"
                />
              ) : (
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl text-white font-bold border-4 border-white/20">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'M'}
                </div>
              )}

              {/* Upload overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
                {uploadingPhoto ? (
                  <div className="text-white text-xs">{t('loading')}...</div>
                ) : (
                  <MdCameraAlt className="text-white text-2xl" />
                )}
              </label>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">{profile?.full_name}</h2>
              <p className="text-indigo-100">{profile?.email}</p>
              <p className="text-indigo-200 text-sm mt-1">
                {t('member_since')} {new Date(profile?.joined_at).toLocaleDateString(
                  lang === 'fr' ? 'fr-FR' : 'en-US',
                  { month: 'long', year: 'numeric' }
                )}
              </p>
            </div>
          </div>

          {/* Photo upload hint */}
          <p className="text-indigo-200 text-xs mt-4 flex items-center gap-1">
            <MdCameraAlt size={14} />
            {t('click_photo_to_change') || 'Survolez la photo pour la modifier'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdPerson className="text-gray-400" />
              {t('full_name')} *
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            ) : (
              <p className="px-4 py-3 bg-gray-700/50 rounded-lg text-white">
                {profile?.full_name || '-'}
              </p>
            )}
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdEmail className="text-gray-400" />
              {t('email')}
            </label>
            <p className="px-4 py-3 bg-gray-700/30 rounded-lg text-gray-400">
              {profile?.email}
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdPhone className="text-gray-400" />
              {t('phone')}
            </label>
            {editing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <p className="px-4 py-3 bg-gray-700/50 rounded-lg text-white">
                {profile?.phone || '-'}
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdLocationOn className="text-gray-400" />
              {t('address')}
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <p className="px-4 py-3 bg-gray-700/50 rounded-lg text-white">
                {profile?.address || '-'}
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
              <MdCake className="text-gray-400" />
              {t('date_of_birth')}
            </label>
            {editing ? (
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <p className="px-4 py-3 bg-gray-700/50 rounded-lg text-white">
                {profile?.date_of_birth
                  ? new Date(profile.date_of_birth).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-US'
                    )
                  : '-'}
              </p>
            )}
          </div>

          {/* Action buttons */}
          {editing && (
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                <MdSave />
                {submitting ? t('saving') : t('save')}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Roles Section */}
      {profile?.roles?.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MdPerson className="text-green-400" />
            {t('my_roles')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.roles.map((role) => (
              <span
                key={role.id}
                className="px-4 py-2 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: role.color || '#6366f1' }}
              >
                {lang === 'fr' ? role.name_fr : role.name_en}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberProfilePage;
