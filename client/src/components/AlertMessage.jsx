import React, { useEffect, useState } from 'react';
import { MdCheckCircle, MdError, MdWarning, MdInfo, MdClose } from 'react-icons/md';

/**
 * Composant AlertMessage - Affiche des messages d'alerte stylisés
 *
 * @param {string} type - Type d'alerte: 'success', 'error', 'warning', 'info'
 * @param {string} message - Le message à afficher
 * @param {function} onClose - Fonction appelée pour fermer l'alerte (optionnel)
 * @param {boolean} autoClose - Fermer automatiquement après un délai (défaut: false)
 * @param {number} autoCloseDelay - Délai en ms avant fermeture auto (défaut: 5000)
 * @param {string} className - Classes CSS additionnelles
 */
const AlertMessage = ({
  type = 'info',
  message,
  onClose,
  autoClose = false,
  autoCloseDelay = 5000,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (autoClose && message) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, message]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!message || !isVisible) return null;

  // Configuration des styles par type
  const config = {
    success: {
      bgColor: 'bg-green-900/40',
      borderColor: 'border-green-500',
      textColor: 'text-green-400',
      icon: <MdCheckCircle className="w-5 h-5 text-green-400" />,
    },
    error: {
      bgColor: 'bg-red-900/40',
      borderColor: 'border-red-500',
      textColor: 'text-red-400',
      icon: <MdError className="w-5 h-5 text-red-400" />,
    },
    warning: {
      bgColor: 'bg-amber-900/40',
      borderColor: 'border-amber-500',
      textColor: 'text-amber-400',
      icon: <MdWarning className="w-5 h-5 text-amber-400" />,
    },
    info: {
      bgColor: 'bg-blue-900/40',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-400',
      icon: <MdInfo className="w-5 h-5 text-blue-400" />,
    },
  };

  const { bgColor, borderColor, textColor, icon } = config[type] || config.info;

  return (
    <div
      className={`
        ${bgColor} ${borderColor} ${textColor}
        border-l-4 rounded-r-lg p-4
        flex items-start gap-3
        transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'}
        ${className}
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      {onClose && (
        <button
          onClick={handleClose}
          className={`flex-shrink-0 ${textColor} hover:opacity-70 transition-opacity`}
          aria-label="Fermer"
        >
          <MdClose className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default AlertMessage;
