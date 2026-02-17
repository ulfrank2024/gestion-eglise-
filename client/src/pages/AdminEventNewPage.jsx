import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';
import { api } from '../api/api';
import { MdEvent, MdImage, MdCalendarToday, MdArrowBack, MdSave, MdNotifications } from 'react-icons/md';
import AlertMessage from '../components/AlertMessage';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/errorHandler';
import { InlineSpinner } from '../components/LoadingSpinner';

function AdminEventNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [eventNameFr, setEventNameFr] = useState('');
  const [eventNameEn, setEventNameEn] = useState('');
  const [descriptionFr, setDescriptionFr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [backgroundImageFile, setBackgroundImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [eventStartDate, setEventStartDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [notifyMembers, setNotifyMembers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [churchId, setChurchId] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userInfo = await api.auth.me();
        const currentChurchId = userInfo.church_id;

        if (!currentChurchId) {
          setError(t('error_church_id_missing'));
          return;
        }
        setChurchId(currentChurchId);
      } catch (err) {
        console.error('Error fetching user info:', err);
        setError(t('error_church_id_missing'));
      }
    };

    fetchUserInfo();
  }, [t, navigate]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBackgroundImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setBackgroundImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!churchId) {
      const errorMsg = t('error_church_id_missing');
      setError(errorMsg);
      showError(errorMsg);
      setLoading(false);
      return;
    }

    let finalImageUrl = imageUrl;

    try {
      if (backgroundImageFile) {
        const fileExt = backgroundImageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `event_backgrounds/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('event_images')
          .upload(filePath, backgroundImageFile);

        if (uploadError) {
          throw new Error(`${t('error_uploading_image')}: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('event_images')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrlData.publicUrl;
      } else if (!imageUrl) {
        finalImageUrl = null;
      }

      await api.admin.createEvent({
        name_fr: eventNameFr,
        name_en: eventNameEn,
        description_fr: descriptionFr,
        description_en: descriptionEn,
        background_image_url: finalImageUrl,
        event_start_date: eventStartDate || null,
        is_archived: isCompleted,
        notify_members: notifyMembers,
      });

      showSuccess(t('event_created_successfully'));
      setTimeout(() => {
        navigate('/admin/events');
      }, 1500);

    } catch (err) {
      console.error('Error creating event:', err);
      const errorMsg = getErrorMessage(err, t);
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/events')}
          className="flex items-center text-gray-400 hover:text-gray-200 transition-colors"
        >
          <MdArrowBack className="mr-2" />
          {t('back_to_events') || 'Retour aux événements'}
        </button>
      </div>

      {/* Form Card */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <div className="flex items-center text-white">
            <MdEvent className="text-2xl mr-3" />
            <span className="font-semibold">{t('event_information') || 'Informations de l\'événement'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Event Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t('event_name_fr')} *
              </label>
              <input
                type="text"
                value={eventNameFr}
                onChange={(e) => setEventNameFr(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Nom de l'événement en français"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t('event_name_en')} *
              </label>
              <input
                type="text"
                value={eventNameEn}
                onChange={(e) => setEventNameEn(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Event name in English"
              />
            </div>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t('description_fr')} *
              </label>
              <textarea
                value={descriptionFr}
                onChange={(e) => setDescriptionFr(e.target.value)}
                required
                rows="4"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                placeholder="Description en français..."
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t('description_en')} *
              </label>
              <textarea
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                required
                rows="4"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                placeholder="Description in English..."
              />
            </div>
          </div>

          {/* Event Date */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              <MdCalendarToday className="inline mr-2" />
              {t('event_date')}
            </label>
            <input
              type="datetime-local"
              value={eventStartDate}
              onChange={(e) => setEventStartDate(e.target.value)}
              className="w-full md:w-1/2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              <MdImage className="inline mr-2" />
              {t('background_image_url')}
            </label>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer hover:file:bg-indigo-700"
                  />
                </div>
                {backgroundImageFile && (
                  <p className="mt-2 text-sm text-green-400">
                    ✓ {backgroundImageFile.name}
                  </p>
                )}
              </div>
              {imagePreview && (
                <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-600">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Or URL */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              {t('or_image_url_direct')}
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              disabled={backgroundImageFile !== null}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            {/* Notify Members */}
            <div className="flex items-start p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <input
                type="checkbox"
                id="notifyMembers"
                checked={notifyMembers}
                onChange={(e) => setNotifyMembers(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded bg-gray-700 border-gray-600 text-amber-600 focus:ring-amber-500 focus:ring-offset-gray-800"
              />
              <div className="ml-3">
                <label htmlFor="notifyMembers" className="flex items-center text-gray-200 font-medium cursor-pointer">
                  <MdNotifications className="mr-2 text-amber-500" />
                  {t('notify_members') || 'Notifier les membres'}
                </label>
                <p className="text-sm text-gray-400 mt-1">
                  {t('notify_members_hint') || 'Envoyer un email à tous les membres de l\'église pour les informer de ce nouvel événement'}
                </p>
              </div>
            </div>

            {/* Is Archived */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isCompleted"
                checked={isCompleted}
                onChange={(e) => setIsCompleted(e.target.checked)}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-800"
              />
              <label htmlFor="isCompleted" className="ml-3 text-gray-300">
                {t('is_completed')}
              </label>
            </div>
          </div>

          {/* Error Message */}
          <AlertMessage
            type="error"
            message={error}
            onClose={() => setError('')}
          />

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MdSave className="mr-2" />
              {loading ? <><InlineSpinner /> {t('creating')}</> : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminEventNewPage;
