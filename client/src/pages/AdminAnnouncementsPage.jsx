import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';
import {
  MdAnnouncement, MdAdd, MdEdit, MdDelete, MdPublish,
  MdUnpublished, MdClose, MdCheck
} from 'react-icons/md';

function AdminAnnouncementsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title_fr: '',
    title_en: '',
    content_fr: '',
    content_en: '',
    is_published: false,
    expires_at: ''
  });

  // États pour la modal de confirmation de suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getAnnouncements();
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingAnnouncement) {
        await api.admin.updateAnnouncement(editingAnnouncement.id, formData);
        setSuccess(t('announcement_updated') || 'Annonce mise à jour!');
      } else {
        await api.admin.createAnnouncement(formData);
        setSuccess(t('announcement_created') || 'Annonce créée!');
      }
      setShowModal(false);
      setEditingAnnouncement(null);
      setFormData({ title_fr: '', title_en: '', content_fr: '', content_en: '', is_published: false, expires_at: '' });
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title_fr: announcement.title_fr,
      title_en: announcement.title_en,
      content_fr: announcement.content_fr,
      content_en: announcement.content_en,
      is_published: announcement.is_published,
      expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleTogglePublish = async (announcement) => {
    try {
      await api.admin.publishAnnouncement(announcement.id, !announcement.is_published);
      setSuccess(announcement.is_published
        ? t('announcement_unpublished') || 'Annonce dépubliée'
        : t('announcement_published') || 'Annonce publiée!'
      );
      fetchAnnouncements();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = (announcement) => {
    setAnnouncementToDelete(announcement);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!announcementToDelete) return;
    setDeleting(true);
    try {
      await api.admin.deleteAnnouncement(announcementToDelete.id);
      setShowDeleteModal(false);
      setAnnouncementToDelete(null);
      setSuccess(t('announcement_deleted') || 'Annonce supprimée');
      fetchAnnouncements();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const openAddModal = () => {
    setEditingAnnouncement(null);
    setFormData({ title_fr: '', title_en: '', content_fr: '', content_en: '', is_published: false, expires_at: '' });
    setShowModal(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MdAnnouncement className="text-3xl text-amber-400" />
          <h1 className="text-2xl font-bold text-white">
            {t('announcements') || 'Annonces'}
          </h1>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all"
        >
          <MdAdd size={20} />
          {t('create_announcement') || 'Créer une annonce'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400 flex items-center gap-2">
          <MdClose />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <MdClose />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-400 flex items-center gap-2">
          <MdCheck />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto">
            <MdClose />
          </button>
        </div>
      )}

      {/* Liste des annonces */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <MdAnnouncement className="mx-auto text-6xl text-gray-600 mb-4" />
            <p className="text-gray-400">{t('no_announcements') || 'Aucune annonce'}</p>
            <p className="text-sm text-gray-500 mt-2">
              {t('create_first_announcement') || 'Créez votre première annonce pour communiquer avec vos membres'}
            </p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`bg-gray-800 rounded-xl border overflow-hidden transition-colors ${
                announcement.is_published ? 'border-green-700' : 'border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  {announcement.is_published ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-full">
                      <MdPublish size={14} />
                      {t('published') || 'Publiée'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">
                      <MdUnpublished size={14} />
                      {t('draft') || 'Brouillon'}
                    </span>
                  )}
                  {announcement.expires_at && (
                    <span className="text-xs text-gray-500">
                      {t('expires')} {new Date(announcement.expires_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePublish(announcement)}
                    className={`p-2 rounded-lg transition-colors ${
                      announcement.is_published
                        ? 'text-amber-400 hover:text-amber-300 hover:bg-gray-700'
                        : 'text-green-400 hover:text-green-300 hover:bg-gray-700'
                    }`}
                    title={announcement.is_published ? t('unpublish') || 'Dépublier' : t('publish') || 'Publier'}
                  >
                    {announcement.is_published ? <MdUnpublished size={20} /> : <MdPublish size={20} />}
                  </button>
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <MdEdit size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <MdDelete size={20} />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {lang === 'fr' ? announcement.title_fr : announcement.title_en}
                </h3>
                <p className="text-gray-400 text-sm whitespace-pre-wrap">
                  {lang === 'fr' ? announcement.content_fr : announcement.content_en}
                </p>
                {announcement.published_at && (
                  <p className="text-xs text-gray-500 mt-3">
                    {t('published_on') || 'Publiée le'} {new Date(announcement.published_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal d'ajout/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 rounded-t-xl flex items-center justify-between sticky top-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MdAnnouncement />
                {editingAnnouncement
                  ? t('edit_announcement') || 'Modifier l\'annonce'
                  : t('create_announcement') || 'Créer une annonce'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <MdClose size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">{t('title_fr') || 'Titre (FR)'} *</label>
                  <input
                    type="text"
                    value={formData.title_fr}
                    onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">{t('title_en') || 'Titre (EN)'} <span className="text-gray-500 text-xs">({t('optional') || 'optionnel'})</span></label>
                  <input
                    type="text"
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    placeholder={formData.title_fr || ''}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('content_fr') || 'Contenu (FR)'} *</label>
                <textarea
                  value={formData.content_fr}
                  onChange={(e) => setFormData({ ...formData, content_fr: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows="4"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('content_en') || 'Contenu (EN)'} <span className="text-gray-500 text-xs">({t('optional') || 'optionnel'})</span></label>
                <textarea
                  value={formData.content_en}
                  onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                  placeholder={formData.content_fr || ''}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows="4"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('expiration_date') || 'Date d\'expiration'}</label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('expiration_hint') || 'Laisser vide pour une annonce sans expiration'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="is_published" className="text-gray-300">
                  {t('publish_immediately') || 'Publier immédiatement'}
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50"
                >
                  {submitting ? t('saving') || 'Enregistrement...' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setAnnouncementToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={t('delete_announcement')}
        message={t('confirm_delete_announcement_message', {
          title: announcementToDelete ? (lang === 'fr' ? announcementToDelete.title_fr : announcementToDelete.title_en) : ''
        })}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        type="danger"
        loading={deleting}
      />
    </div>
  );
}

export default AdminAnnouncementsPage;
