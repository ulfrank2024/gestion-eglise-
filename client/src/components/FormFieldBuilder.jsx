import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api'; // Utiliser notre objet api
import { useNavigate } from 'react-router-dom'; // Pour la redirection
import ConfirmationModal from './ConfirmationModal';
import './FormFieldBuilder.css';
import { MdInfoOutline } from 'react-icons/md'; // Importer une icône

function FormFieldBuilder({ eventId, churchId }) { // Accepter churchId comme prop
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [newField, setNewField] = useState({
    label_fr: '',
    label_en: '',
    field_type: 'text',
    is_required: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // États pour la modale de confirmation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState(null);

  useEffect(() => {
    // Si eventId ou churchId ne sont pas fournis, on ne fait rien.
    if (!eventId || !churchId) {
      setLoading(false);
      return;
    }

    const fetchFields = async () => {
      try {
        setLoading(true);
        const data = await api.admin.getEventFormFields(eventId);
        setFields(data);
      } catch (err) {
        console.error('Error fetching form fields:', err);
        setError(err.response?.data?.error || err.message || t('error_fetching_fields'));
        // La redirection globale est gérée par l'intercepteur dans api.js
        // On n'a plus besoin de la logique de redirection ici.
      } finally {
        setLoading(false);
      }
    };
    
    fetchFields();
    
  }, [eventId, churchId, t]); // Dépendre de eventId et churchId

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewField(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newField.label_fr || !newField.label_en) {
      setError(t('labels_are_required'));
      return;
    }
    setError('');
    try {
      // Le church_id est maintenant géré côté backend via le middleware `protect`
      const response = await api.admin.createFormField(eventId, {
        ...newField,
        order: fields.length + 1,
      });
      setFields(prev => [...prev, response]);
      setNewField({ label_fr: '', label_en: '', field_type: 'text', is_required: true });
    } catch (err) {
      console.error('Error adding form field:', err);
      setError(err.response?.data?.error || err.message || t('error_adding_field'));
    }
  };

  const handleDeleteClick = (fieldId) => {
    setFieldToDelete(fieldId);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!fieldToDelete) return;
    setError('');
    try {
      await api.admin.deleteFormField(fieldToDelete);
      setFields(prev => prev.filter(field => field.id !== fieldToDelete));
    } catch (err) {
      console.error('Error deleting form field:', err);
      setError(err.response?.data?.error || err.message || t('error_deleting_field'));
    } finally {
      setIsModalOpen(false);
      setFieldToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsModalOpen(false);
    setFieldToDelete(null);
  };

  if (loading) return <p>{t('loading_fields')}...</p>;
  
  return (
    <div className="form-builder-container">
      {error && <p className="error-message">{error}</p>}
      <h4>{t('custom_registration_form')}</h4>
      
      {/* Note d'information pour l'admin */}
      <div style={{ 
        backgroundColor: 'rgba(55, 65, 81, 0.5)', 
        padding: '12px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #4b5563'
      }}>
        <MdInfoOutline style={{ color: '#9ca3af', marginRight: '10px', fontSize: '1.2em' }} />
        <p style={{ margin: 0, color: '#d1d5db', fontSize: '0.9em' }}>
          {t('default_fields_info_message')}
        </p>
      </div>

      <div className="fields-list">
        {fields.length === 0 ? (
          <p>{t('no_custom_fields_yet')}</p>
        ) : (
          fields.map(field => (
            <div key={field.id} className="field-item">
              <span>{i18n.language === 'fr' ? field.label_fr : field.label_en} ({field.field_type}) {field.is_required ? `(${t('required')})` : ''}</span>
              <button onClick={() => handleDeleteClick(field.id)} className="delete-btn">×</button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAddField} className="add-field-form">
        <h5>{t('add_new_field')}</h5>
        <div className="form-group">
          <label>{t('label_fr')}</label>
          <input type="text" name="label_fr" value={newField.label_fr} onChange={handleInputChange} required />
        </div>
        <div className="form-group">
          <label>{t('label_en')}</label>
          <input type="text" name="label_en" value={newField.label_en} onChange={handleInputChange} required />
        </div>
        <div className="form-group">
          <label>{t('field_type')}</label>
          <select name="field_type" value={newField.field_type} onChange={handleInputChange}>
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="checkbox">Checkbox</option>
          </select>
        </div>
        <div className="form-group-checkbox">
          <input type="checkbox" id="is_required" name="is_required" checked={newField.is_required} onChange={handleInputChange} />
          <label htmlFor="is_required">{t('is_required_field')}</label>
        </div>
        <button type="submit" className="add-btn">{t('add_field')}</button>
      </form>

      <ConfirmationModal
        show={isModalOpen}
        title={t('confirmation')}
        message={t('confirm_delete_field')}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
    </div>
  );
}

export default FormFieldBuilder;
