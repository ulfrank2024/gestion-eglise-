import React from 'react';
import { useTranslation } from 'react-i18next';
import './ConfirmationModal.css';

const DeleteChurchModal = ({ isOpen, onClose, onConfirm, churchName }) => {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{t('confirm_delete_church_title')}</h3>
        </div>
        <div className="modal-body">
          <p>
            {t('confirm_delete_church_message', { churchName: churchName })}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteChurchModal;
