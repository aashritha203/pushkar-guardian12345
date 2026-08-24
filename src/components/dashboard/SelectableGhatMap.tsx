import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import type { Ghat } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { GoogleMap, OverlayView, InfoWindow, useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

function colorFor(status: Ghat["status"]) {
  return status === "critical" ? "#EF4444" : status === "moderate" ? "#F59E0B" : "#22C55E";
}
function radiusFor(occ: number) { return 10 + (occ / 100) * 28; }

const mapContainerStyle = {
  width: "100%",
  height: "100%"
};

export function SelectableGhatMap({
  ghats,
  selected,
  onSelect,
}: {
  ghats: Ghat[];
  selected: Ghat | null;
  onSelect: (g: Ghat) => void;
}) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMapInstance(null);
  }, []);

  // Manage the single TrafficLayer instance - PERMANENTLY ON
  useEffect(() => {
    if (!mapInstance) return;
    
    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new window.google.maps.TrafficLayer();
      trafficLayerRef.current.setMap(mapInstance);
    }
    
    return () => {};
  }, [mapInstance]);

  // Handle zooming and panning when a marker is selected
  useEffect(() => {
    if (selected && mapInstance) {
      mapInstance.panTo({ lat: selected.latitude, lng: selected.longitude });
      mapInstance.setZoom(13); // Zoom 13 maximizes traffic road coverage visibility
    }
  }, [selected, mapInstance]);

  const handleMapClick = () => {
    setPopupOpen(false);
  };

  const center = useMemo(() => {
    if (!ghats.length) return { lat: 16.99, lng: 81.78 };
    const lat = ghats.reduce((s, g) => s + g.latitude, 0) / ghats.length;
    const lng = ghats.reduce((s, g) => s + g.longitude, 0) / ghats.length;
    return { lat, lng };
  }, [ghats]);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-muted/20">
        <p className="text-muted-foreground">Unable to load Google Traffic.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-muted/20">
        <p className="text-muted-foreground">Loading maps...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border">
      <style>{`
        @keyframes heartbeat {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .marker-pulse {
          animation: heartbeat 1.5s ease-in-out infinite;
        }
      `}</style>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={9}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          gestureHandling: "greedy",
          zoomControl: true,
        }}
      >
        {ghats.map((g) => {
          const color = colorFor(g.status);
          const isSelected = selected?.id === g.id;
          const baseSize = radiusFor(g.occupancyPercentage) * 2.5; // 2-3x larger
          const size = isSelected ? baseSize * 1.2 : baseSize;
          
          return (
            <OverlayView
              key={g.id}
              position={{ lat: g.latitude, lng: g.longitude }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
            >
              <div 
                style={{ width: size, height: size, zIndex: isSelected ? 100 : 1 }}
                className="relative flex items-center justify-center cursor-pointer transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(g);
                  setPopupOpen(true);
                }}
              >
                {/* Expanding outer ring */}
                <div 
                  className="absolute rounded-full marker-pulse pointer-events-none"
                  style={{ 
                    background: color, 
                    width: '100%', 
                    height: '100%',
                  }} 
                />
                {/* Solid center circle */}
                <div 
                  className="relative rounded-full shadow-lg border-[3px] border-white/90"
                  style={{ 
                    background: color, 
                    width: '80%', 
                    height: '80%',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                  }} 
                />
              </div>
            </OverlayView>
          );
        })}

        {popupOpen && selected && (
          <InfoWindow
            position={{ lat: selected.latitude, lng: selected.longitude }}
            onCloseClick={() => setPopupOpen(false)}
            options={{
              pixelOffset: new window.google.maps.Size(0, -30)
            }}
          >
            <div className="min-w-[220px] space-y-2 text-sm p-1 text-black">
              {selected.snapshot && (
                <img 
                  src={selected.snapshot} 
                  alt={`Snapshot of ${selected.name}`}
                  className="mb-2 w-full rounded-md object-cover"
                />
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-gray-900">{selected.name}</div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                <div>Camera</div><div className="text-right text-gray-900">{selected.cameraId}</div>
                <div>District</div><div className="text-right text-gray-900">{selected.district}</div>
                <div>River Side</div><div className="text-right text-gray-900">{selected.riverSide}</div>
                <div>People</div><div className="text-right text-gray-900 tabular-nums">{selected.currentPeople.toLocaleString()}</div>
                <div>Capacity</div><div className="text-right text-gray-900 tabular-nums">{selected.maximumCapacity.toLocaleString()}</div>
                <div>Occupancy</div><div className="text-right font-semibold" style={{ color: colorFor(selected.status) }}>{selected.occupancyPercentage}%</div>
              </div>
              <button
                onClick={() => onSelect(selected)}
                className="w-full rounded-md py-1.5 text-xs font-semibold text-white transition mt-2"
                style={{ background: `linear-gradient(90deg, #3b82f6, #22d3ee)` }}
              >
                Select this Ghat
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend overlay */}
      <div className="absolute bottom-8 right-2 z-[1000] rounded-lg border border-border bg-background/90 px-3 py-2 text-[10px] backdrop-blur shadow-sm">
        <div className="mb-1 font-semibold text-muted-foreground">LEGEND</div>
        {[["#22C55E","Safe (0–60%)"],["#F59E0B","Moderate (60–80%)"],["#EF4444","High (80–100%)"]].map(([c,l])=>(
          <div key={l} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full inline-block" style={{ background: c }} />
            <span className="text-muted-foreground">{l}</span>
          </div>
        ))}
        <div className="mt-1 border-t border-border pt-1 text-[9px] text-muted-foreground">Click marker to select ghat</div>
      </div>
    </div>
  );
}
