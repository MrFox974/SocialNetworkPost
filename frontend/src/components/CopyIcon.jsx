/**
 * Icône neutre pour copier, avec hover explicite (indique qu'on peut cliquer)
 */
export default function CopyIcon({ onClick, title = 'Copier', className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-all cursor-pointer text-[var(--sf-text-dim)] hover:text-[var(--sf-cta)] hover:bg-[var(--sf-card-hover)] ${className}`}
      aria-label={title}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  );
}
