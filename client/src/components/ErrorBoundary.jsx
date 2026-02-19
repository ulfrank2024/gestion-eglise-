import React from 'react';
import { MdErrorOutline, MdRefresh, MdHome } from 'react-icons/md';

/**
 * ErrorBoundary global — intercepte les erreurs React non gérées
 * Sans ce composant, une erreur dans n'importe quel composant → écran blanc
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log en production (on pourrait envoyer à Sentry, etc.)
    console.error('=== ErrorBoundary caught ===', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-xl border border-red-700 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-700 to-red-900 p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/30 rounded-full flex items-center justify-center flex-shrink-0">
              <MdErrorOutline className="text-white text-3xl" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Oups ! Une erreur est survenue</h1>
              <p className="text-red-200 text-sm mt-0.5">Something went wrong</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <p className="text-gray-300 text-sm">
              L'application a rencontré un problème inattendu. Veuillez recharger la page ou retourner à l'accueil.
            </p>

            {/* Détails techniques en mode développement */}
            {isDev && this.state.error && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <p className="text-xs text-red-400 font-mono break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium"
              >
                <MdRefresh className="text-lg" />
                Recharger
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                <MdHome className="text-lg" />
                Accueil
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
