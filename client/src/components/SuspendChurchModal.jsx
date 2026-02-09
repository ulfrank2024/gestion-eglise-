import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdClose, MdPause, MdPlayArrow, MdEmail, MdWarning } from 'react-icons/md';
import api from '../api/api';

/**
 * Modal pour suspendre ou réactiver une église
 * @param {Object} props
 * @param {Object} props.church - L'église à suspendre/réactiver
 * @param {boolean} props.isOpen - Si le modal est ouvert
 * @param {Function} props.onClose - Callback de fermeture
 * @param {Function} props.onSuccess - Callback après succès
 */
const SuspendChurchModal = ({ church, isOpen, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !church) return null;

  const isSuspended = church.is_suspended;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSuspended) {
        // Réactiver l'église
        await api.superAdmin.reactivateChurch(church.id, {
          message,
          language: i18n.language
        });
      } else {
        // Suspendre l'église
        if (!reason.trim()) {
          setError(t('suspension.reason_required', 'La raison est obligatoire'));
          setLoading(false);
          return;
        }
        await api.superAdmin.suspendChurch(church.id, {
          reason,
          message,
          language: i18n.language
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || t('error_generic', 'Une erreur est survenue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        backdropFilter: 'blur(4px)',
        padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          border: `1px solid ${isSuspended ? '#22c55e' : '#dc2626'}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            background: isSuspended
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            padding: '20px',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                padding: '10px',
                display: 'flex',
              }}
            >
              {isSuspended ? <MdPlayArrow size={24} color="#fff" /> : <MdPause size={24} color="#fff" />}
            </div>
            <div>
              <h2 style={{ color: '#fff', margin: 0, fontSize: '18px', fontWeight: '600' }}>
                {isSuspended
                  ? t('suspension.reactivate_title', 'Réactiver l\'église')
                  : t('suspension.suspend_title', 'Suspendre l\'église')}
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '4px 0 0', fontSize: '14px' }}>
                {church.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <MdClose size={20} color="#fff" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Avertissement */}
          {!isSuspended && (
            <div
              style={{
                backgroundColor: '#7f1d1d',
                border: '1px solid #dc2626',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <MdWarning size={24} color="#fbbf24" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ color: '#fef2f2', margin: 0, fontSize: '14px' }}>
                  {t('suspension.warning', 'Attention : Cette action bloquera l\'accès au tableau de bord pour l\'admin et tous les membres de cette église.')}
                </p>
              </div>
            </div>
          )}

          {/* Raison (uniquement pour suspension) */}
          {!isSuspended && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#d1d5db', fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                {t('suspension.reason_label', 'Raison de la suspension')} *
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('suspension.reason_placeholder', 'Ex: Non-paiement, violation des conditions...')}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Message email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#d1d5db', fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              <MdEmail size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              {t('suspension.message_label', 'Message à envoyer à l\'administrateur')}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isSuspended
                ? t('suspension.reactivate_message_placeholder', 'Informez l\'admin que son compte a été réactivé...')
                : t('suspension.suspend_message_placeholder', 'Expliquez la situation et les démarches à suivre...')}
              rows={5}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#374151',
                border: '1px solid #4b5563',
                borderRadius: '8px',
                color: '#f3f4f6',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ color: '#9ca3af', fontSize: '12px', margin: '8px 0 0' }}>
              {t('suspension.email_note', 'Un email sera automatiquement envoyé à l\'administrateur principal de l\'église.')}
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div
              style={{
                backgroundColor: '#7f1d1d',
                border: '1px solid #dc2626',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#fef2f2',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          {/* Boutons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#374151',
                border: '1px solid #4b5563',
                borderRadius: '8px',
                color: '#d1d5db',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {t('cancel', 'Annuler')}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: isSuspended
                  ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                  : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                t('loading', 'Chargement...')
              ) : isSuspended ? (
                <>
                  <MdPlayArrow size={18} />
                  {t('suspension.reactivate_button', 'Réactiver')}
                </>
              ) : (
                <>
                  <MdPause size={18} />
                  {t('suspension.suspend_button', 'Suspendre')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuspendChurchModal;
