import React from 'react';
import { useTranslation } from 'react-i18next';
import './ConfirmationModal.css'; // Nous créerons ce fichier CSS

function ConfirmationModal({ show, title, message, onConfirm, onCancel, confirmText, cancelText }) {
  if (!show) {
    return null;
  }

  const { t } = useTranslation();

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{title || t('confirmation')}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText || t('cancel')}
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmText || t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;