import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { MdSystemUpdate, MdClose, MdRefresh } from 'react-icons/md';

/**
 * Composant qui affiche une notification quand une nouvelle version de l'app est disponible
 * L'utilisateur n'a PAS besoin de se déconnecter - sa session est préservée
 */
const UpdatePrompt = () => {
  const { t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
      // Vérifier les mises à jour toutes les heures
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // 1 heure
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: '90%',
        width: '400px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1f2937',
          border: '1px solid #4f46e5',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              backgroundColor: '#4f46e5',
              borderRadius: '50%',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MdSystemUpdate size={24} color="#fff" />
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{
              color: '#f3f4f6',
              fontSize: '16px',
              fontWeight: '600',
              margin: '0 0 4px 0',
            }}>
              {t('update_available', 'Nouvelle version disponible')} 🎉
            </h3>
            <p style={{
              color: '#9ca3af',
              fontSize: '14px',
              margin: '0 0 12px 0',
              lineHeight: '1.4',
            }}>
              {t('update_description', 'Une mise à jour est prête. Actualisez pour profiter des nouvelles fonctionnalités.')}
            </p>

            {/* Info importante */}
            <div style={{
              backgroundColor: '#1e3a5f',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '12px',
            }}>
              <p style={{
                color: '#93c5fd',
                fontSize: '13px',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                ✅ {t('update_no_logout', 'Pas besoin de vous déconnecter ! Votre session est préservée.')}
              </p>
            </div>

            {/* Boutons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleUpdate}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#4338ca'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#4f46e5'}
              >
                <MdRefresh size={18} />
                {t('update_now', 'Actualiser maintenant')}
              </button>

              <button
                onClick={handleDismiss}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#374151',
                  color: '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#374151'}
                title={t('update_later', 'Plus tard')}
              >
                <MdClose size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Animation CSS */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default UpdatePrompt;
