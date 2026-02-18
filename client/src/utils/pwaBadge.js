/**
 * PWA Badge API - Affiche un badge sur l'icône de l'application
 * Fonctionne sur Android Chrome, Edge et certains navigateurs desktop
 * Docs: https://developer.mozilla.org/en-US/docs/Web/API/Badging_API
 */

/**
 * Définit le badge de l'icône de l'application avec un compteur
 * @param {number} count - Nombre à afficher (0 = effacer le badge)
 */
export function setAppBadge(count) {
  if (typeof navigator === 'undefined') return;

  if (count > 0) {
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(count).catch(() => {
        // API non supportée ou permission refusée
      });
    }
  } else {
    clearAppBadge();
  }
}

/**
 * Efface le badge de l'icône de l'application
 */
export function clearAppBadge() {
  if (typeof navigator === 'undefined') return;

  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {
      // API non supportée ou permission refusée
    });
  }
}
