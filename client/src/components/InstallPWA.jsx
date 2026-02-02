import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MdDownload, MdClose, MdPhoneAndroid, MdCheckCircle, MdInstallMobile } from 'react-icons/md';

function InstallPWA() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Vérifier si c'est iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Écouter l'événement beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Écouter l'installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      // Si pas de prompt disponible, afficher les instructions générales
      setShowIOSInstructions(true);
      return;
    }

    // Afficher le prompt d'installation
    deferredPrompt.prompt();

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleOpenBanner = () => {
    setShowBanner(true);
  };

  const handleCloseBanner = () => {
    setShowBanner(false);
    setShowIOSInstructions(false);
  };

  // Ne rien afficher si déjà installé
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Bouton permanent pour ouvrir la bannière */}
      <button
        onClick={handleOpenBanner}
        className="fixed bottom-4 right-4 z-[90] bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2 animate-pulse hover:animate-none"
      >
        <MdInstallMobile size={24} />
        <span className="hidden sm:inline font-medium">{t('install_app') || 'Installer l\'app'}</span>
      </button>

      {/* Bannière d'installation (modal) */}
      {showBanner && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-4 w-full max-w-md border border-indigo-400/30 animate-slide-up">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <MdPhoneAndroid className="text-2xl text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">
                    {t('install_app') || 'Installer MY EDEN X'}
                  </h3>
                  <p className="text-indigo-100 text-xs">
                    {t('install_app_subtitle') || 'Accès rapide depuis votre écran'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseBanner}
                className="text-white/70 hover:text-white p-1"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Avantages */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full flex items-center gap-1">
                <MdCheckCircle size={12} />
                {t('offline_access') || 'Accès hors ligne'}
              </span>
              <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full flex items-center gap-1">
                <MdCheckCircle size={12} />
                {t('fast_loading') || 'Chargement rapide'}
              </span>
              <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full flex items-center gap-1">
                <MdCheckCircle size={12} />
                {t('no_store') || 'Sans téléchargement'}
              </span>
            </div>

            {/* Bouton d'installation */}
            <button
              onClick={handleInstallClick}
              className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors active:scale-95"
            >
              <MdDownload size={20} />
              {isIOS
                ? (t('see_instructions') || 'Voir les instructions')
                : (t('install_now') || 'Installer maintenant')
              }
            </button>
          </div>
        </div>
      )}

      {/* Modal d'instructions iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-2xl max-w-sm w-full overflow-hidden border border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">
                  {isIOS
                    ? (t('install_on_ios') || 'Installer sur iPhone/iPad')
                    : 'Comment installer'
                  }
                </h3>
                <button
                  onClick={handleCloseBanner}
                  className="text-white/70 hover:text-white"
                >
                  <MdClose size={24} />
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 space-y-4">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {t('ios_step1_title') || 'Appuyer sur Partager'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {t('ios_step1_desc') || 'Touchez l\'icône ⬆️ en bas de Safari'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {t('ios_step2_title') || 'Sur l\'écran d\'accueil'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {t('ios_step2_desc') || 'Faites défiler et touchez "Sur l\'écran d\'accueil"'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {t('ios_step3_title') || 'Ajouter'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {t('ios_step3_desc') || 'Touchez "Ajouter" en haut à droite'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="text-white font-medium">Ouvrir le menu</p>
                      <p className="text-gray-400 text-sm">Cliquez sur ⋮ (menu) en haut à droite de Chrome</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="text-white font-medium">Installer l'application</p>
                      <p className="text-gray-400 text-sm">Sélectionnez "Installer MY EDEN X" ou "Ajouter à l'écran d'accueil"</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="text-white font-medium">Confirmer</p>
                      <p className="text-gray-400 text-sm">Cliquez sur "Installer" dans la popup</p>
                    </div>
                  </div>
                </>
              )}

              {/* Image illustrative */}
              <div className="bg-gray-900 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">
                  {isIOS ? '📱 ➡️ ⬆️ ➡️ ➕' : '📱 ➡️ ⋮ ➡️ ➕'}
                </div>
                <p className="text-gray-400 text-xs">
                  {isIOS
                    ? (t('ios_illustration') || 'Safari → Partager → Sur l\'écran d\'accueil')
                    : 'Chrome → Menu → Installer'
                  }
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={handleCloseBanner}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                {t('understood') || 'Compris !'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles d'animation */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}

export default InstallPWA;
