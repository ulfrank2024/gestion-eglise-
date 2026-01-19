import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from './ConfirmationModal';
import './FormFieldBuilder.css';
import { MdInfoOutline, MdAdd, MdDelete } from 'react-icons/md';

function FormFieldBuilder({ eventId, churchId }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [newField, setNewField] = useState({
    label_fr: '',
    label_en: '',
    field_type: 'text',
    is_required: true,
    selection_type: 'single', // Pour checkbox: 'single' ou 'multiple'
    options: [], // Options pour checkbox/select
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // État pour une nouvelle option
  const [newOption, setNewOption] = useState({ label_fr: '', label_en: '' });

  // États pour la modale de confirmation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState(null);

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };

    fetchFields();

  }, [eventId, churchId, t]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewField(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleOptionInputChange = (e) => {
    const { name, value } = e.target;
    setNewOption(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddOption = () => {
    if (!newOption.label_fr.trim() || !newOption.label_en.trim()) {
      setError(t('option_labels_required'));
      return;
    }
    setNewField(prev => ({
      ...prev,
      options: [...prev.options, { ...newOption }],
    }));
    setNewOption({ label_fr: '', label_en: '' });
    setError('');
  };

  const handleRemoveOption = (index) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newField.label_fr || !newField.label_en) {
      setError(t('labels_are_required'));
      return;
    }

    // Validation: checkbox/select nécessite au moins 2 options
    if (newField.field_type === 'select' && newField.options.length < 2) {
      setError(t('min_two_options_required'));
      return;
    }

    setError('');
    try {
      const fieldData = {
        label_fr: newField.label_fr,
        label_en: newField.label_en,
        field_type: newField.field_type,
        is_required: newField.is_required,
        order: fields.length + 1,
      };

      // Ajouter options et selection_type seulement pour les champs select
      if (newField.field_type === 'select') {
        fieldData.options = newField.options;
        fieldData.selection_type = newField.selection_type;
      }

      const response = await api.admin.createFormField(eventId, fieldData);
      setFields(prev => [...prev, response]);
      setNewField({
        label_fr: '',
        label_en: '',
        field_type: 'text',
        is_required: true,
        selection_type: 'single',
        options: [],
      });
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

  const getFieldTypeLabel = (field) => {
    if (field.field_type === 'select') {
      const selectionLabel = field.selection_type === 'multiple'
        ? t('multiple_selection')
        : t('single_selection');
      return `${t('field_type_select')} (${selectionLabel})`;
    }
    return field.field_type;
  };

  const renderFieldOptions = (field) => {
    if (field.field_type !== 'select' || !field.options || field.options.length === 0) {
      return null;
    }

    return (
      <div className="field-options-preview">
        {field.options.map((opt, idx) => (
          <span key={idx} className="option-badge">
            {i18n.language === 'fr' ? opt.label_fr : opt.label_en}
          </span>
        ))}
      </div>
    );
  };

  if (loading) return <p className="loading-text">{t('loading_fields')}...</p>;

  return (
    <div className="form-builder-container">
      {error && <p className="error-message">{error}</p>}
      <h4>{t("custom_registration_form")}</h4>

      {/* Note d'information pour l'admin */}
      <div className="info-note">
        <MdInfoOutline className="info-icon" />
        <p>{t("default_fields_info_message")}</p>
      </div>

      <div className="fields-list">
        {fields.length === 0 ? (
          <p className="no-fields-message">{t("no_custom_fields_yet")}</p>
        ) : (
          fields.map((field) => (
            <div key={field.id} className="field-item">
              <div className="field-info">
                <span className="field-label">
                  {i18n.language === "fr" ? field.label_fr : field.label_en}
                </span>
                <span className="field-meta">
                  {getFieldTypeLabel(field)}
                  {field.is_required ? ` (${t("required")})` : ""}
                </span>
                {renderFieldOptions(field)}
              </div>
              <button
                onClick={() => handleDeleteClick(field.id)}
                className="delete-btn"
                title={t('delete')}
              >
                <MdDelete />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAddField} className="add-field-form">
        <h5>{t("add_new_field")}</h5>

        <div className="form-row">
          <div className="form-group">
            <label>{t("label_fr")}</label>
            <input
              type="text"
              name="label_fr"
              value={newField.label_fr}
              onChange={handleInputChange}
              placeholder={t("label_fr_placeholder")}
              required
            />
          </div>
          <div className="form-group">
            <label>{t("label_en")}</label>
            <input
              type="text"
              name="label_en"
              value={newField.label_en}
              onChange={handleInputChange}
              placeholder={t("label_en_placeholder")}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t("field_type")}</label>
            <select
              name="field_type"
              value={newField.field_type}
              onChange={handleInputChange}
            >
              <option value="text">{t("field_type_text")}</option>
              <option value="email">{t("field_type_email")}</option>
              <option value="select">{t("field_type_select")}</option>
              <option value="checkbox">{t("field_type_checkbox_simple")}</option>
            </select>
          </div>

          {newField.field_type === 'select' && (
            <div className="form-group">
              <label>{t("selection_type")}</label>
              <select
                name="selection_type"
                value={newField.selection_type}
                onChange={handleInputChange}
              >
                <option value="single">{t("single_selection")}</option>
                <option value="multiple">{t("multiple_selection")}</option>
              </select>
            </div>
          )}
        </div>

        {/* Section des options pour les champs select */}
        {newField.field_type === 'select' && (
          <div className="options-section">
            <label className="options-label">{t("field_options")}</label>

            {/* Liste des options ajoutées */}
            {newField.options.length > 0 && (
              <div className="options-list">
                {newField.options.map((opt, index) => (
                  <div key={index} className="option-item">
                    <span className="option-text">
                      {i18n.language === 'fr' ? opt.label_fr : opt.label_en}
                      <span className="option-alt">
                        ({i18n.language === 'fr' ? opt.label_en : opt.label_fr})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="remove-option-btn"
                    >
                      <MdDelete />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulaire pour ajouter une option */}
            <div className="add-option-form">
              <input
                type="text"
                name="label_fr"
                value={newOption.label_fr}
                onChange={handleOptionInputChange}
                placeholder={t("option_label_fr")}
                className="option-input"
              />
              <input
                type="text"
                name="label_en"
                value={newOption.label_en}
                onChange={handleOptionInputChange}
                placeholder={t("option_label_en")}
                className="option-input"
              />
              <button
                type="button"
                onClick={handleAddOption}
                className="add-option-btn"
              >
                <MdAdd /> {t("add_option")}
              </button>
            </div>

            <p className="options-hint">{t("min_options_hint")}</p>
          </div>
        )}

        <div className="form-group-checkbox">
          <input
            type="checkbox"
            id="is_required"
            name="is_required"
            checked={newField.is_required}
            onChange={handleInputChange}
          />
          <label htmlFor="is_required">{t("is_required_field")}</label>
        </div>

        <button type="submit" className="add-btn">
          {t("add_field")}
        </button>
      </form>

      <ConfirmationModal
        show={isModalOpen}
        title={t("confirmation")}
        message={t("confirm_delete_field")}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText={t("delete")}
        cancelText={t("cancel")}
      />
    </div>
  );
}

export default FormFieldBuilder;
