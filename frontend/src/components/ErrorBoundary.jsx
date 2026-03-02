/**
 * ============================================================================
 * ERROR BOUNDARY - React Router v7
 * ============================================================================
 * 
 * Ce composant est affiché automatiquement par React Router v7 quand :
 * - Une erreur est throw dans un loader
 * - Une erreur survient lors du rendu d'un composant de route
 * - Une erreur 404 (route non trouvée)
 * 
 * FONCTIONNALITÉ V7 : useRouteError()
 * 
 * useRouteError() est un hook qui permet d'accéder à l'erreur qui a déclenché
 * l'affichage de l'errorElement.
 * 
 * TYPES D'ERREURS :
 * 
 * 1. Response Error (depuis un loader)
 *    - Status code HTTP (404, 500, etc.)
 *    - Message d'erreur
 * 
 * 2. Error Object (erreur JavaScript)
 *    - message : Description de l'erreur
 *    - stack : Stack trace (en développement)
 * 
 * 3. 404 Not Found
 *    - Quand une route n'existe pas
 * 
 * AVANTAGES :
 * - Gestion centralisée des erreurs
 * - Interface utilisateur cohérente en cas d'erreur
 * - Pas besoin de try/catch dans chaque composant
 */

import { useRouteError, Link, isRouteErrorResponse } from 'react-router-dom';

function ErrorBoundary() {
  /**
   * useRouteError() - Hook React Router v7
   * 
   * Récupère l'erreur qui a déclenché l'affichage de ce composant.
   * Peut être :
   * - Une Response (si throw depuis un loader)
   * - Une Error (erreur JavaScript)
   * - Un objet avec status/statusText (404, etc.)
   */
  const error = useRouteError();
  
  /**
   * isRouteErrorResponse() - Fonction utilitaire React Router v7
   * 
   * Vérifie si l'erreur est une Response Error (depuis un loader).
   * Permet de différencier les erreurs HTTP des erreurs JavaScript.
   */
  const isResponseError = isRouteErrorResponse(error);
  
  // Détermine le message et le code d'erreur à afficher
  let errorMessage = 'Une erreur est survenue';
  let errorStatus = null;
  
  if (isResponseError) {
    // Erreur HTTP (404, 500, etc.) depuis un loader
    errorStatus = error.status;
    errorMessage = error.statusText || errorMessage;
    
    // Messages personnalisés selon le code d'erreur
    if (error.status === 404) {
      errorMessage = 'Page non trouvée';
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur';
    }
  } else if (error instanceof Error) {
    // Erreur JavaScript classique
    errorMessage = error.message;
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--sf-bg)' }}>
      <div className="text-center p-8 sm:p-10 rounded-xl shadow-xl max-w-md border border-[var(--sf-border)]" style={{ backgroundColor: 'var(--sf-card)' }}>
        <p className="sf-section-label">Erreur</p>
        <div className="text-5xl mb-4">⚠️</div>
        {errorStatus && (
          <h1 className="sf-heading-display mb-2" style={{ color: 'var(--sf-danger)' }}>
            {errorStatus}
          </h1>
        )}
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--sf-text)', fontFamily: 'var(--sf-heading-font)' }}>
          {errorMessage}
        </h2>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer mb-2" style={{ color: 'var(--sf-text-muted)' }}>
              Détails techniques
            </summary>
            <pre className="p-4 rounded-lg text-xs overflow-auto border border-[var(--sf-border)]" style={{ backgroundColor: 'var(--sf-bg-elevated)', color: 'var(--sf-text-dim)' }}>
              {JSON.stringify(error, null, 2)}
            </pre>
          </details>
        )}
        <Link
          to="/dashboard"
          className="sf-cta-button inline-flex items-center justify-center mt-6 bg-[var(--sf-cta)] hover:opacity-90"
          style={{ color: 'var(--sf-cta-text)' }}
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}

export default ErrorBoundary;