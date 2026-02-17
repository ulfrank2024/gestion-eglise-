import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdDelete, MdClose, MdWarning } from 'react-icons/md';

const DeleteChurchModal = ({ isOpen, onClose, onConfirm, churchName }) => {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div className="relative mx-auto w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gray-800 rounded-lg shadow-2xl border border-red-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <MdDelete className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('confirm_delete_church_title')}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
              type="button"
            >
              <MdClose className="text-2xl" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Warning message */}
            <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 flex items-start space-x-3">
              <MdWarning className="text-red-400 text-2xl flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-sm">
                  {t('confirm_delete_church_message', { churchName: '' })}
                </p>
                <p className="text-white font-bold mt-1 text-lg">{churchName}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium border border-gray-600"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg hover:from-red-700 hover:to-red-900 transition-all font-medium shadow-lg flex items-center justify-center space-x-2"
              >
                <MdDelete className="text-lg" />
                <span>{t('delete')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteChurchModal;
