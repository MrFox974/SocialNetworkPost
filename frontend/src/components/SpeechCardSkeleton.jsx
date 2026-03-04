export default function SpeechCardSkeleton({ withCheckbox = false }) {
  return (
    <div className="rounded-xl border p-4 flex gap-4 animate-pulse" style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-card)' }}>
      <div className={`flex-1 grid gap-4 ${withCheckbox ? 'grid-cols-[auto_1fr_1fr_1fr_1fr]' : 'grid-cols-4'}`}>
        {withCheckbox && <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: 'var(--sf-surface-alt)' }} />}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 rounded w-full" style={{ backgroundColor: 'var(--sf-surface-alt)' }} />
            <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'var(--sf-surface-alt)' }} />
            <div className="h-4 rounded w-full" style={{ backgroundColor: 'var(--sf-surface-alt)' }} />
          </div>
        ))}
      </div>
      <div className="w-8 h-8 rounded shrink-0" style={{ backgroundColor: 'var(--sf-surface-alt)' }} />
    </div>
  );
}
