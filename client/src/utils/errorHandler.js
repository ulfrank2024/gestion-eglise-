/**
 * Utilitaire de gestion des erreurs
 * Centralise la gestion des messages d'erreur avec support i18n
 */

// Mapping des codes d'erreur vers les clés de traduction
const ERROR_CODES = {
  // Erreurs d'authentification
  'invalid_credentials': 'error_invalid_credentials',
  'unauthorized': 'error_unauthorized',
  'forbidden': 'error_forbidden',
  'session_expired': 'error_session_expired',
  'token_invalid': 'error_token_invalid',

  // Erreurs de validation
  'missing_fields': 'error_missing_fields',
  'invalid_email': 'error_invalid_email',
  'password_too_short': 'error_password_too_short',
  'passwords_dont_match': 'error_passwords_dont_match',

  // Erreurs de ressources
  'not_found': 'error_not_found',
  'already_exists': 'error_already_exists',
  'church_not_found': 'error_church_not_found',
  'event_not_found': 'error_event_not_found',
  'user_not_found': 'error_user_not_found',
  'member_not_found': 'error_member_not_found',

  // Erreurs de réseau
  'network_error': 'error_network',
  'timeout': 'error_timeout',
  'server_error': 'error_server',

  // Erreurs d'upload
  'upload_failed': 'error_upload_failed',
  'file_too_large': 'error_file_too_large',
  'invalid_file_type': 'error_invalid_file_type',

  // Erreurs de permission
  'no_permission': 'error_no_permission',
  'main_admin_required': 'error_main_admin_required',

  // Erreurs génériques
  'unknown': 'error_unknown',
};

/**
 * Extrait un message d'erreur lisible depuis une erreur
 * @param {Error|Object} error - L'erreur à traiter
 * @param {Function} t - La fonction de traduction i18n
 * @returns {string} Le message d'erreur traduit
 */
export const getErrorMessage = (error, t) => {
  // Si c'est déjà une string, la retourner
  if (typeof error === 'string') {
    // Vérifier si c'est une clé de traduction
    const translated = t(error);
    return translated !== error ? translated : error;
  }

  // Erreur Axios
  if (error.response) {
    const { status, data } = error.response;

    // Vérifier si le serveur a envoyé un code d'erreur
    if (data?.code && ERROR_CODES[data.code]) {
      return t(ERROR_CODES[data.code]);
    }

    // Vérifier si le serveur a envoyé un message
    if (data?.error) {
      // Vérifier si c'est une clé de traduction connue
      const translatedError = t(data.error);
      if (translatedError !== data.error) {
        return translatedError;
      }
      return data.error;
    }

    if (data?.message) {
      return data.message;
    }

    // Messages basés sur le status HTTP
    switch (status) {
      case 400:
        return t('error_bad_request');
      case 401:
        return t('error_unauthorized');
      case 403:
        return t('error_forbidden');
      case 404:
        return t('error_not_found');
      case 409:
        return t('error_already_exists');
      case 422:
        return t('error_validation');
      case 429:
        return t('error_too_many_requests');
      case 500:
        return t('error_server');
      case 502:
      case 503:
      case 504:
        return t('error_service_unavailable');
      default:
        return t('error_unknown');
    }
  }

  // Erreur réseau (pas de réponse)
  if (error.request) {
    return t('error_network');
  }

  // Erreur JavaScript standard
  if (error.message) {
    // Vérifier si c'est une clé de traduction
    const translated = t(error.message);
    return translated !== error.message ? translated : error.message;
  }

  // Erreur inconnue
  return t('error_unknown');
};

/**
 * Crée un gestionnaire d'erreur pour les appels API
 * @param {Function} t - La fonction de traduction i18n
 * @param {Function} setError - Fonction pour définir l'état d'erreur
 * @param {Object} options - Options additionnelles
 * @returns {Function} Fonction de gestion d'erreur
 */
export const createErrorHandler = (t, setError, options = {}) => {
  const { logToConsole = true, showGenericOnUnknown = true } = options;

  return (error) => {
    if (logToConsole) {
      console.error('Error:', error);
    }

    const message = getErrorMessage(error, t);
    setError(message);

    return message;
  };
};

/**
 * Vérifie si une erreur est une erreur d'authentification
 * @param {Error|Object} error - L'erreur à vérifier
 * @returns {boolean}
 */
export const isAuthError = (error) => {
  if (error.response) {
    return error.response.status === 401 || error.response.status === 403;
  }
  return false;
};

/**
 * Vérifie si une erreur est une erreur réseau
 * @param {Error|Object} error - L'erreur à vérifier
 * @returns {boolean}
 */
export const isNetworkError = (error) => {
  return !error.response && error.request;
};

export default {
  getErrorMessage,
  createErrorHandler,
  isAuthError,
  isNetworkError,
  ERROR_CODES,
};
