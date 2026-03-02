export default function SpeechCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 flex gap-4 animate-pulse">
      <div className="flex-1 grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-slate-700 rounded w-full" />
            <div className="h-4 bg-slate-700 rounded w-3/4" />
            <div className="h-4 bg-slate-700 rounded w-full" />
          </div>
        ))}
      </div>
      <div className="w-8 h-8 rounded bg-slate-700 shrink-0" />
    </div>
  );
}
