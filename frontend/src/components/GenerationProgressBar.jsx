import { useGenerationProgress } from '../contexts/GenerationProgressContext';

/**
 * Barre de progression fixe affichée sous le header pendant la génération de scripts.
 * Progression réelle basée sur le nombre de scripts générés (ex. 3/7 = 43%).
 */
export default function GenerationProgressBar() {
  const { isGenerating, progress, label } = useGenerationProgress();

  if (!isGenerating) return null;

  return (
    <div
      className="fixed left-0 right-0 z-30 h-1 overflow-hidden"
      style={{
        top: '4rem',
        backgroundColor: 'var(--sf-surface-alt)',
      }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Génération des scripts en cours'}
    >
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: 'var(--sf-cta)',
        }}
      />
    </div>
  );
}
