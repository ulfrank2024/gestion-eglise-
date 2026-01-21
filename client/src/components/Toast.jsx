import React, { createContext, useContext, useState, useCallback } from 'react';
import { MdCheckCircle, MdError, MdWarning, MdInfo, MdClose } from 'react-icons/md';

// Contexte pour les toasts
const ToastContext = createContext(null);

/**
 * Hook pour utiliser les toasts
 * @returns {Object} { showToast, showSuccess, showError, showWarning, showInfo }
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Provider pour les toasts - à mettre dans App.jsx ou main.jsx
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback(({ type = 'info', message, duration = 5000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }

    return id;
  }, [removeToast]);

  const showSuccess = useCallback((message, duration) => {
    return showToast({ type: 'success', message, duration });
  }, [showToast]);

  const showError = useCallback((message, duration = 7000) => {
    return showToast({ type: 'error', message, duration });
  }, [showToast]);

  const showWarning = useCallback((message, duration) => {
    return showToast({ type: 'warning', message, duration });
  }, [showToast]);

  const showInfo = useCallback((message, duration) => {
    return showToast({ type: 'info', message, duration });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * Conteneur des toasts - affiché en haut à droite
 */
const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map(toast => (
        <ToastItem key={toast.id} {...toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
};

/**
 * Un toast individuel
 */
const ToastItem = ({ type, message, onClose }) => {
  const config = {
    success: {
      bgColor: 'bg-green-800',
      borderColor: 'border-green-500',
      textColor: 'text-green-100',
      icon: <MdCheckCircle className="w-5 h-5 text-green-300" />,
    },
    error: {
      bgColor: 'bg-red-800',
      borderColor: 'border-red-500',
      textColor: 'text-red-100',
      icon: <MdError className="w-5 h-5 text-red-300" />,
    },
    warning: {
      bgColor: 'bg-amber-800',
      borderColor: 'border-amber-500',
      textColor: 'text-amber-100',
      icon: <MdWarning className="w-5 h-5 text-amber-300" />,
    },
    info: {
      bgColor: 'bg-blue-800',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-100',
      icon: <MdInfo className="w-5 h-5 text-blue-300" />,
    },
  };

  const { bgColor, borderColor, textColor, icon } = config[type] || config.info;

  return (
    <div
      className={`
        ${bgColor} ${borderColor} ${textColor}
        border rounded-lg shadow-lg p-4
        flex items-start gap-3
        animate-slide-in
        min-w-[300px]
      `}
      role="alert"
    >
      <div className="flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      <button
        onClick={onClose}
        className={`flex-shrink-0 ${textColor} hover:opacity-70 transition-opacity`}
        aria-label="Fermer"
      >
        <MdClose className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ToastProvider;
