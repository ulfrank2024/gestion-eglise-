import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/api';
import ConfirmationModal from './ConfirmationModal'; // Importer la modale de confirmation
import './FormFieldBuilder.css';

function FormFieldBuilder({ eventId }) {
  const { t, i18n } = useTranslation();
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
    const fetchFields = async () => {
      try {
        const response = await apiClient.get(`/admin/events/${eventId}/form-fields`);
        setFields(response.data);
      } catch (err) {
        setError(t('error_fetching_fields'));
        console.error('Error fetching form fields:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFields();
  }, [eventId, t]);

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
      // Remplacer l'alerte par un message d'erreur plus doux
      setError(t('labels_are_required'));
      return;
    }
    setError(''); // Clear error on successful validation
    try {
      const response = await apiClient.post(`/admin/events/${eventId}/form-fields`, {
        ...newField,
        order: fields.length + 1,
      });
      setFields(prev => [...prev, response.data]);
      setNewField({ label_fr: '', label_en: '', field_type: 'text', is_required: true }); // Reset form
    } catch (err) {
      setError(t('error_adding_field'));
      console.error('Error adding form field:', err);
    }
  };

  const handleDeleteClick = (fieldId) => {
    setFieldToDelete(fieldId);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!fieldToDelete) return;
    try {
      await apiClient.delete(`/admin/form-fields/${fieldToDelete}`);
      setFields(prev => prev.filter(field => field.id !== fieldToDelete));
    } catch (err) {
      setError(t('error_deleting_field'));
      console.error('Error deleting form field:', err);
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
