import { MapContainer, TileLayer, CircleMarker, Popup, ScaleControl } from "react-leaflet";
import { useMemo } from "react";
import type { Ghat } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

function colorFor(status: Ghat["status"]) {
  return status === "critical" ? "#EF4444" : status === "moderate" ? "#F59E0B" : "#22C55E";
}
function radiusFor(occ: number) { return 10 + (occ / 100) * 28; }

export function GhatMap({ ghats }: { ghats: Ghat[] }) {
  const center = useMemo<[number, number]>(() => {
    if (!ghats.length) return [16.99, 81.78];
    const lat = ghats.reduce((s, g) => s + g.latitude, 0) / ghats.length;
    const lng = ghats.reduce((s, g) => s + g.longitude, 0) / ghats.length;
    return [lat, lng];
  }, [ghats]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border">
      <MapContainer center={center} zoom={9} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ScaleControl position="bottomleft" />
        {ghats.map((g) => {
          const color = colorFor(g.status);
          return (
            <CircleMarker
              key={g.id}
              center={[g.latitude, g.longitude]}
              radius={radiusFor(g.occupancyPercentage)}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.45, weight: 2 }}
            >
              <Popup>
                <div className="min-w-[220px] space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-foreground">{g.name}</div>
                    <StatusBadge status={g.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <div>Camera</div><div className="text-right text-foreground">{g.cameraId}</div>
                    <div>District</div><div className="text-right text-foreground">{g.district}</div>
                    <div>River Side</div><div className="text-right text-foreground">{g.riverSide}</div>
                    <div>People</div><div className="text-right text-foreground tabular-nums">{g.currentPeople.toLocaleString()}</div>
                    <div>Capacity</div><div className="text-right text-foreground tabular-nums">{g.maximumCapacity.toLocaleString()}</div>
                    <div>Occupancy</div><div className="text-right font-semibold" style={{ color }}>{g.occupancyPercentage}%</div>
                    <div>Camera</div><div className="text-right text-foreground capitalize">{g.cameraHealth}</div>
                    <div>Updated</div><div className="text-right text-foreground">{new Date(g.lastUpdated).toLocaleTimeString()}</div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
