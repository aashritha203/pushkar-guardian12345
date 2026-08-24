import { useLiveGhats } from "@/hooks/use-live";

export function GlobalAlertBanner() {
  const ghats = useLiveGhats();
  
  // Find any ghat over 10 people
  const crowdedGhats = ghats.filter(g => g.currentPeople > 10);

  if (crowdedGhats.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-600/95 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border border-red-400 flex items-center gap-3 animate-in slide-in-from-top-10 fade-in duration-300">
      <span className="text-xl">⚠️</span>
      <span className="font-semibold text-sm">
        High Crowd Alert: {crowdedGhats.map(g => `${g.name} (${g.currentPeople} people)`).join(", ")}
      </span>
    </div>
  );
}
