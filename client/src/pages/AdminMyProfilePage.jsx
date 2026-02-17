import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MdAccountCircle, MdEmail, MdPhone, MdLocationOn,
  MdCake, MdEdit, MdSave, MdClose, MdCameraAlt, MdPerson
} from 'react-icons/md';

function AdminMyProfilePage() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    date_of_birth: '',
    profile_photo_url: null
  });

  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const userInfo = await api.auth.me();

      // Essayer de récupérer le profil admin
      const adminProfile = await api.admin.getAdminProfile();

      setProfile({
        full_name: adminProfile.full_name || userInfo.full_name || '',
        email: userInfo.email || '',
        phone: adminProfile.phone || '',
        address: adminProfile.address || '',
        city: adminProfile.city || '',
        date_of_birth: adminProfile.date_of_birth ? (adminProfile.date_of_birth.length > 5 ? adminProfile.date_of_birth.slice(5, 10) : adminProfile.date_of_birth) : '',
        profile_photo_url: adminProfile.profile_photo_url || null
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      // Si pas de profil admin, utiliser les infos de base
      try {
        const userInfo = await api.auth.me();
        setProfile({
          full_name: userInfo.full_name || '',
          email: userInfo.email || '',
          phone: '',
          address: '',
          city: '',
          date_of_birth: '',
          profile_photo_url: userInfo.profile_photo_url || null
        });
      } catch (e) {
        setError(t('error_fetching_profile') || 'Erreur lors de la récupération du profil');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditForm({ ...profile });
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditing(false);
    setEditForm({});
    setError('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      await api.admin.updateAdminProfile({
        full_name: editForm.full_name,
        phone: editForm.phone,
        address: editForm.address,
        city: editForm.city,
        date_of_birth: editForm.date_of_birth,
        profile_photo_url: editForm.profile_photo_url
      });

      setProfile({ ...editForm });
      setEditing(false);
      setSuccess(t('profile_updated_successfully') || 'Profil mis à jour avec succès');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.error || t('error_saving_profile') || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setError('');

      // Upload via l'API backend (bypass RLS)
      const { url: publicUrl } = await api.admin.uploadProfilePhoto(file);

      if (editing) {
        setEditForm({ ...editForm, profile_photo_url: publicUrl });
      } else {
        // Sauvegarder directement
        await api.admin.updateAdminProfile({ profile_photo_url: publicUrl });
        setProfile({ ...profile, profile_photo_url: publicUrl });
        setSuccess(t('photo_updated_successfully') || 'Photo mise à jour avec succès');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(t('error_uploading_photo') || 'Erreur lors de l\'upload de la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    // Format "MM-DD" ou ancien format "YYYY-MM-DD"
    const parts = dateString.length > 5 ? dateString.slice(5, 10).split('-') : dateString.split('-');
    const month = parseInt(parts[0]) - 1;
    const day = parseInt(parts[1]);
    if (isNaN(month) || isNaN(day)) return '-';
    return `${day} ${new Date(2000, month).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' })}`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MdAccountCircle className="text-3xl text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">{t('my_profile') || 'Mon Profil'}</h1>
            <p className="text-gray-400 text-sm">
              {t('my_profile_subtitle') || 'Gérez vos informations personnelles'}
            </p>
          </div>
        </div>

        {!editing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <MdEdit />
            {t('edit') || 'Modifier'}
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
          <MdSave />
          {success}
        </div>
      )}

      {/* Profil Card */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {/* Photo et nom */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              {(editing ? editForm.profile_photo_url : profile.profile_photo_url) ? (
                <img
                  src={editing ? editForm.profile_photo_url : profile.profile_photo_url}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center border-4 border-white/20">
                  <MdAccountCircle className="text-5xl text-gray-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-colors">
                <MdCameraAlt className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
              </label>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {editing ? editForm.full_name : profile.full_name || '-'}
              </h2>
              <p className="text-indigo-100">{profile.email}</p>
              {uploadingPhoto && (
                <p className="text-indigo-200 text-sm mt-1">{t('uploading') || 'Upload en cours...'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Informations */}
        <div className="p-6">
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">{t('full_name') || 'Nom complet'}</label>
                  <input
                    type="text"
                    value={editForm.full_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">{t('phone') || 'Téléphone'}</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">{t('address') || 'Adresse'}</label>
                  <input
                    type="text"
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">{t('city') || 'Ville'}</label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">{t('date_of_birth') || 'Date de naissance'}</label>
                  <div className="flex gap-2">
                    <select
                      value={(editForm.date_of_birth || '').split('-')[0] || ''}
                      onChange={(e) => {
                        const day = (editForm.date_of_birth || '').split('-')[1] || '';
                        setEditForm({ ...editForm, date_of_birth: e.target.value && day ? `${e.target.value}-${day}` : e.target.value ? `${e.target.value}-` : '' });
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
                      value={(editForm.date_of_birth || '').split('-')[1] || ''}
                      onChange={(e) => {
                        const month = (editForm.date_of_birth || '').split('-')[0] || '';
                        setEditForm({ ...editForm, date_of_birth: month && e.target.value ? `${month}-${e.target.value}` : '' });
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
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <MdClose />
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                  <MdSave />
                  {saving ? t('saving') || 'Sauvegarde...' : t('save') || 'Sauvegarder'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <MdPerson className="text-gray-400 text-xl" />
                <div>
                  <p className="text-gray-500 text-sm">{t('full_name') || 'Nom complet'}</p>
                  <p className="text-white">{profile.full_name || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MdEmail className="text-gray-400 text-xl" />
                <div>
                  <p className="text-gray-500 text-sm">{t('email') || 'Email'}</p>
                  <p className="text-white">{profile.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MdPhone className="text-gray-400 text-xl" />
                <div>
                  <p className="text-gray-500 text-sm">{t('phone') || 'Téléphone'}</p>
                  <p className="text-white">{profile.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MdLocationOn className="text-gray-400 text-xl" />
                <div>
                  <p className="text-gray-500 text-sm">{t('address') || 'Adresse'}</p>
                  <p className="text-white">{profile.address || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MdLocationOn className="text-gray-400 text-xl" />
                <div>
                  <p className="text-gray-500 text-sm">{t('city') || 'Ville'}</p>
                  <p className="text-white">{profile.city || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MdCake className="text-gray-400 text-xl" />
                <div>
                  <p className="text-gray-500 text-sm">{t('date_of_birth') || 'Date de naissance'}</p>
                  <p className="text-white">{formatDate(profile.date_of_birth)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminMyProfilePage;
