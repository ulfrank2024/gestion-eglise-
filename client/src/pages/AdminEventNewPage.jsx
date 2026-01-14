import React, { useState, useEffect } from 'react'; // Ajout de useEffect
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';
import { api } from '../api/api'; // Utiliser notre objet api

function AdminEventNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [eventNameFr, setEventNameFr] = useState('');
  const [eventNameEn, setEventNameEn] = useState('');
  const [descriptionFr, setDescriptionFr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [backgroundImageFile, setBackgroundImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [churchId, setChurchId] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Récupérer les infos utilisateur via l'API (church_id est dans la DB, pas dans le token JWT)
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
      setBackgroundImageFile(e.target.files[0]);
    } else {
      setBackgroundImageFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!churchId) {
        setError(t('error_church_id_missing'));
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
      });

      setSuccess(t('event_created_successfully'));
      setEventNameFr('');
      setEventNameEn('');
      setDescriptionFr('');
      setDescriptionEn('');
      setBackgroundImageFile(null);
      setImageUrl('');
      setEventStartDate('');
      setIsCompleted(false);
      navigate('/admin/dashboard');

    } catch (err) {
      console.error('Error creating event:', err);
      setError(err.response?.data?.error || err.message || t('error_creating_event'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h2>{t('create_new_event')}</h2>
      <form onSubmit={handleSubmit}>
        {/* Event Name (French) */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="eventNameFr" style={{ display: 'block', marginBottom: '5px' }}>{t('event_name_fr')}:</label>
          <input
            type="text"
            id="eventNameFr"
            value={eventNameFr}
            onChange={(e) => setEventNameFr(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        {/* Event Name (English) */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="eventNameEn" style={{ display: 'block', marginBottom: '5px' }}>{t('event_name_en')}:</label>
          <input
            type="text"
            id="eventNameEn"
            value={eventNameEn}
            onChange={(e) => setEventNameEn(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        {/* Description (French) */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="descriptionFr" style={{ display: 'block', marginBottom: '5px' }}>{t('description_fr')}:</label>
          <textarea
            id="descriptionFr"
            value={descriptionFr}
            onChange={(e) => setDescriptionFr(e.target.value)}
            required
            rows="4"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          ></textarea>
        </div>

        {/* Description (English) */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="descriptionEn" style={{ display: 'block', marginBottom: '5px' }}>{t('description_en')}:</label>
          <textarea
            id="descriptionEn"
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            required
            rows="4"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          ></textarea>
        </div>

        {/* Background Image Upload */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="backgroundImage" style={{ display: 'block', marginBottom: '5px' }}>{t('background_image_url')}:</label>
          <input
            type="file"
            id="backgroundImage"
            accept="image/*"
            onChange={handleFileChange}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          {backgroundImageFile && <p style={{marginTop: '5px'}}>Selected file: {backgroundImageFile.name}</p>}
        </div>

        {/* Or provide URL directly */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="imageUrl" style={{ display: 'block', marginBottom: '5px' }}>{t('or_image_url_direct')}:</label>
          <input
            type="text"
            id="imageUrl"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
            disabled={backgroundImageFile !== null}
          />
        </div>
        
        {/* Event Date */}
        <div style={{ marginBottom: '15px' }}>
            <label htmlFor="eventStartDate" style={{ display: 'block', marginBottom: '5px' }}>{t('event_date')}:</label>
            <input
                type="datetime-local"
                id="eventStartDate"
                value={eventStartDate}
                onChange={(e) => setEventStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
            />
        </div>

        {/* Is Archived Checkbox */}
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            id="isCompleted"
            checked={isCompleted}
            onChange={(e) => setIsCompleted(e.target.checked)}
            style={{ marginRight: '10px' }}
          />
          <label htmlFor="isCompleted">{t('is_completed')}</label>
        </div>

        {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}
        {success && <p style={{ color: 'green', marginBottom: '15px' }}>{success}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? t('creating') : t('submit')}
        </button>
      </form>
    </div>
  );
}

export default AdminEventNewPage;
