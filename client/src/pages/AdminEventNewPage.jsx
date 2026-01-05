import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
// import axios from 'axios'; // Supprimé
import { supabase } from '../supabaseClient'; // Importation du client Supabase
import apiClient from '../api/api'; // Importation du client API centralisé

function AdminEventNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [eventNameFr, setEventNameFr] = useState('');
  const [eventNameEn, setEventNameEn] = useState('');
  const [descriptionFr, setDescriptionFr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [backgroundImageFile, setBackgroundImageFile] = useState(null); // Pour le fichier d'image
  const [imageUrl, setImageUrl] = useState(''); // Pour stocker l'URL après l'upload ou si déjà fournie
  const [eventStartDate, setEventStartDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);  // Nouvelle checkbox archivé
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    let finalImageUrl = imageUrl; // Commence avec l'URL potentiellement fournie manuellement

    try {
      // Upload de l'image si un fichier est sélectionné
      if (backgroundImageFile) {
        const fileExt = backgroundImageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `event_backgrounds/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('event_images') // Assurez-vous d'avoir un bucket nommé 'event_images' dans Supabase Storage
          .upload(filePath, backgroundImageFile);

        if (uploadError) {
          throw new Error(`Error uploading image: ${uploadError.message}`);
        }
        
        // Obtenir l'URL publique de l'image
        const { data: publicUrlData } = supabase.storage
          .from('event_images')
          .getPublicUrl(filePath);
        
        finalImageUrl = publicUrlData.publicUrl;

      } else if (!imageUrl) {
        // Si aucun fichier et aucune URL n'est fournie, ce n'est pas une erreur critique, l'image sera juste absente.
        finalImageUrl = null;
      }

      // const token = localStorage.getItem('supabase.auth.token'); // Géré par l'intercepteur
      const response = await apiClient.post('/admin/events', {
        name_fr: eventNameFr,
        name_en: eventNameEn,
        description_fr: descriptionFr,
        description_en: descriptionEn,
        background_image_url: finalImageUrl,
        event_start_date: eventStartDate || null,
        is_archived: isCompleted,
      }); // Suppression de la config

      setSuccess('Event created successfully!');
      // Optionnel: Réinitialiser le formulaire ou rediriger
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
      setError(err.message || 'Failed to create event');
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
          {loading ? 'Creating...' : t('submit')}
        </button>
      </form>
    </div>
  );
}

export default AdminEventNewPage;
