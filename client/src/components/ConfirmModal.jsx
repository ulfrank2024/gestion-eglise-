import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdWarning, MdClose, MdCheck, MdDelete, MdSend } from 'react-icons/md';

/**
 * Modal de confirmation réutilisable
 * @param {boolean} isOpen - Afficher/masquer la modal
 * @param {function} onClose - Fonction appelée à la fermeture
 * @param {function} onConfirm - Fonction appelée à la confirmation
 * @param {string} title - Titre de la modal
 * @param {string} message - Message de confirmation
 * @param {string} confirmText - Texte du bouton de confirmation
 * @param {string} cancelText - Texte du bouton d'annulation
 * @param {string} type - Type de confirmation: 'danger', 'warning', 'info', 'send'
 * @param {boolean} loading - État de chargement
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type = 'warning',
  loading = false
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <MdDelete className="text-3xl" />,
          iconBg: 'bg-red-600',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          headerBg: 'from-red-600 to-red-700'
        };
      case 'send':
        return {
          icon: <MdSend className="text-3xl" />,
          iconBg: 'bg-blue-600',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
          headerBg: 'from-blue-600 to-blue-700'
        };
      case 'info':
        return {
          icon: <MdCheck className="text-3xl" />,
          iconBg: 'bg-green-600',
          buttonBg: 'bg-green-600 hover:bg-green-700',
          headerBg: 'from-green-600 to-green-700'
        };
      case 'warning':
      default:
        return {
          icon: <MdWarning className="text-3xl" />,
          iconBg: 'bg-amber-600',
          buttonBg: 'bg-amber-600 hover:bg-amber-700',
          headerBg: 'from-amber-600 to-amber-700'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md overflow-hidden transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header avec gradient */}
        <div className={`bg-gradient-to-r ${styles.headerBg} p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.iconBg} p-2 rounded-full bg-opacity-30 text-white`}>
              {styles.icon}
            </div>
            <h3 className="text-lg font-semibold text-white">
              {title || t('confirmation')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-300 text-center">
            {message}
          </p>
        </div>

        {/* Footer avec boutons */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {cancelText || t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 ${styles.buttonBg} text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2`}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {confirmText || t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
