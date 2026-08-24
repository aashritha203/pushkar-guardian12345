import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import type { Ghat } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { Search, X } from "lucide-react";
import { GoogleMap, OverlayView, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { detectionService } from "@/lib/detection-service";
import { ref, set, remove, get } from "firebase/database";
import { db, auth } from "@/lib/firebase";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

function colorFor(status: Ghat["status"]): string {
  if (status === "critical") return "#EF4444";
  if (status === "moderate") return "#F59E0B";
  return "#22C55E";
}
function radiusFor(occ: number) { return 10 + (occ / 100) * 28; }

const mapContainerStyle = {
  width: "100%",
  height: "100%"
};

export function GhatMap({
  ghats,
  showSearch = false,
  onSelect,
}: {
  ghats: Ghat[];
  showSearch?: boolean;
  onSelect?: (g: Ghat) => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Ghat | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  
  // Snapshot viewer state
  const [selectedGhatForSnapshot, setSelectedGhatForSnapshot] = useState<Ghat | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<string | null>(null);
  const [headcount, setHeadcount] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [statusColor, setStatusColor] = useState<string>("#fff");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Drag state for the snapshot modal
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number, startY: number } | null>(null);

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

  // Polling for Snapshot
  useEffect(() => {
    if (!selectedGhatForSnapshot) return;

    let mounted = true;
    const pollSelected = async () => {
      if (!selectedGhatForSnapshot) return;
      try {
        const data = await detectionService.getCount(selectedGhatForSnapshot.id);
        if (!mounted) return;
        
        // Always use the real truth from the backend detection service
        setStatus(data.status);
        setStatusColor(colorFor(data.status as Ghat["status"]));

        if (data.status === "stopped" || data.status === "idle") {
          // If the backend says it's stopped, forcibly clear any ghost data
          setLiveSnapshot(null);
          setHeadcount(0);
        } else {
          // Only update images if it's actively running
          if (data.snapshot) {
            setLiveSnapshot(data.snapshot.startsWith('data:') ? data.snapshot : `data:image/jpeg;base64,${data.snapshot}`);
          }
          if (data.count !== undefined) {
            setHeadcount(data.count);
          }
        }
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (e) {
        console.error("Poll error:", e);
      }
    };
    
    pollSelected();
    const interval = setInterval(pollSelected, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [selectedGhatForSnapshot]);

  const initialLoadDone = useRef(false);

  // Auto-open last active ghat on mount
  useEffect(() => {
    if (ghats.length > 0 && !initialLoadDone.current) {
      initialLoadDone.current = true;
      const lastId = localStorage.getItem("last_active_ghat");
      if (lastId) {
        const found = ghats.find((g) => g.id === lastId);
        if (found) {
          setSelected(found);
          setSelectedGhatForSnapshot(found);
          setPopupOpen(true);
        }
      }
    }
  }, [ghats]);

  // Intentionally leaving out map auto-panning as per user request to keep the map constant when a ghat is clicked/searched.

  const handleMapClick = () => {
    setPopupOpen(false);
    setSelectedGhatForSnapshot(null);
    setSelected(null);
  };

  // Automatically close popups and deselect marker when detection stops
  useEffect(() => {
    const handleStop = (e: Event) => {
      const customEvent = e as CustomEvent<{ ghatId?: string }>;
      const stoppedId = customEvent.detail?.ghatId;
      if (!stoppedId) return;

      setSelected((prev) => {
        if (prev?.id === stoppedId) {
          setPopupOpen(false);
          return null;
        }
        return prev;
      });

      setSelectedGhatForSnapshot((prev) => {
        if (prev?.id === stoppedId) {
          return null;
        }
        return prev;
      });
    };

    window.addEventListener("ghat-detection-stopped", handleStop);
    return () => window.removeEventListener("ghat-detection-stopped", handleStop);
  }, []);

  // Check subscription status when panel opens
  useEffect(() => {
    const checkSubscription = async () => {
      if (!selectedGhatForSnapshot) return;
      const user = auth.currentUser;
      if (!user || !user.phoneNumber) return;
      const cleanPhone = user.phoneNumber.replace(/\+/g, "");
      const snap = await get(ref(db, `alert_subscriptions/${selectedGhatForSnapshot.id}/${cleanPhone}`));
      setIsSubscribed(snap.exists());
    };
    checkSubscription();
  }, [selectedGhatForSnapshot]);

  const toggleSubscription = async () => {
    if (!selectedGhatForSnapshot) return;
    const user = auth.currentUser;
    if (!user || !user.phoneNumber) {
      alert("Please log in with your phone number to subscribe to alerts.");
      return;
    }
    const cleanPhone = user.phoneNumber.replace(/\+/g, "");
    const subRef = ref(db, `alert_subscriptions/${selectedGhatForSnapshot.id}/${cleanPhone}`);
    if (isSubscribed) {
      await remove(subRef);
      setIsSubscribed(false);
    } else {
      await set(subRef, true);
      setIsSubscribed(true);
    }
  };

  const center = useMemo(() => {
    if (!ghats.length) return { lat: 16.99, lng: 81.78 };
    const lat = ghats.reduce((s, g) => s + g.latitude, 0) / ghats.length;
    const lng = ghats.reduce((s, g) => s + g.longitude, 0) / ghats.length;
    return { lat, lng };
  }, [ghats]);

  const filtered = useMemo(
    () =>
      q.trim()
        ? ghats.filter(
            (g) =>
              g.name.toLowerCase().includes(q.toLowerCase()) ||
              g.district.toLowerCase().includes(q.toLowerCase())
          )
        : [],
    [ghats, q]
  );

  function selectGhat(g: Ghat) {
    setSelected(g);
    setSelectedGhatForSnapshot(g);
    setPopupOpen(true);
    setQ("");
    localStorage.setItem("last_active_ghat", g.id);
    if (onSelect) onSelect(g);
  }

  const hasData = ghats.some((g) => g.currentPeople > 0);

  const latestSelected = useMemo(() => {
    return selected ? ghats.find(g => g.id === selected.id) || selected : null;
  }, [selected, ghats]);

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
      
      {/* Search bar overlay */}
      {showSearch && (
        <div className="absolute left-3 right-3 top-3 z-[1000]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ghat or district on map…"
              className="w-full rounded-xl border border-border bg-background/90 py-2 pl-9 pr-9 text-sm shadow-lg outline-none backdrop-blur focus:border-primary"
            />
            {q && (
              <button
                 onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {/* Dropdown results */}
          {filtered.length > 0 && (
            <div className="mt-1 max-h-56 overflow-auto rounded-xl border border-border bg-background/95 shadow-xl backdrop-blur">
              {filtered.map((g) => {
                const color = colorFor(g.status);
                return (
                  <button
                    key={g.id}
                    onClick={() => selectGhat(g)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/60 text-left"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="flex-1 font-medium">{g.name}</span>
                    <span className="text-xs text-muted-foreground">{g.district}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                      style={{ background: `${color}22`, color }}
                    >
                      {g.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

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
          const isSelected = selected?.id === g.id;
          const color = isSelected ? "#3B82F6" : colorFor(g.status);
          const baseSize = radiusFor(g.occupancyPercentage) * 2.5; // 2-3x larger
          const size = isSelected ? baseSize * 1.5 : baseSize;
          
          return (
            <OverlayView
              key={g.id}
              position={{ lat: g.latitude, lng: g.longitude }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div 
                style={{ 
                  width: size, 
                  height: size, 
                  zIndex: isSelected ? 100 : 1,
                  position: "absolute",
                  transform: "translate(-50%, -50%)"
                }}
                className="flex items-center justify-center cursor-pointer transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  selectGhat(g);
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
                  className="relative rounded-full border-[3px] border-white/90"
                  style={{ 
                    background: color, 
                    width: '80%', 
                    height: '80%',
                    boxShadow: isSelected ? '0 0 20px rgba(59,130,246,0.8)' : '0 4px 12px rgba(0,0,0,0.4)'
                  }} 
                />
              </div>
            </OverlayView>
          );
        })}

        {popupOpen && latestSelected && (
          <InfoWindow
            position={{ lat: latestSelected.latitude, lng: latestSelected.longitude }}
            onCloseClick={() => {
              setPopupOpen(false);
              setSelected(null);
            }}
            options={{
              pixelOffset: new window.google.maps.Size(0, -30)
            }}
          >
            <div className="min-w-[220px] space-y-1.5 text-sm p-1 text-black">
              {(status !== "stopped" && status !== "idle" && status) && liveSnapshot && (
                <img 
                  src={liveSnapshot} 
                  alt="Live Snapshot"
                  className="mb-2 w-full h-28 rounded-md object-cover border border-gray-200 shadow-sm"
                />
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{latestSelected.name}</div>
                <StatusBadge status={(status === "stopped" || status === "idle" || !status) ? "offline" : latestSelected.status} />
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                <div>Camera</div>
                <div className="text-right text-gray-900">{latestSelected.cameraId}</div>
                <div>District</div>
                <div className="text-right text-gray-900">{latestSelected.district}</div>
                <div>River Side</div>
                <div className="text-right text-gray-900">{latestSelected.riverSide}</div>
                
                {(status === "stopped" || status === "idle" || !status) ? (
                  <div className="col-span-2 text-center text-gray-500 italic py-2 mt-2 border-t border-gray-100">
                    Detection not running
                  </div>
                ) : (
                  <>
                    <div>People</div>
                    <div className="text-right text-gray-900 tabular-nums">
                      {headcount.toLocaleString()}
                    </div>
                    <div>Capacity</div>
                    <div className="text-right text-gray-900 tabular-nums">
                      {latestSelected.maximumCapacity.toLocaleString()}
                    </div>
                    <div>Density</div>
                    <div
                      className="text-right font-semibold"
                      style={{ color: colorFor(status as Ghat["status"] || latestSelected.status) }}
                    >
                      {Math.round((headcount / latestSelected.maximumCapacity) * 100)}%
                    </div>
                  </>
                )}

                <div>Camera</div>
                <div className="text-right text-gray-900 capitalize">
                  {latestSelected.cameraHealth}
                </div>
                <div>Updated</div>
                <div className="text-right text-gray-900">
                  {new Date(latestSelected.lastUpdated).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend */}
      <div className="absolute bottom-8 right-2 z-[1000] rounded-lg border border-border bg-background/90 px-3 py-2 text-[10px] backdrop-blur shadow-sm">
        <div className="mb-1 font-semibold text-muted-foreground">DENSITY</div>
        {[
          ["#22C55E", "Safe (< 40%)"],
          ["#F59E0B", "Moderate (40–70%)"],
          ["#EF4444", "High (≥ 70%)"],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: c }} />
            <span className="text-muted-foreground">{l}</span>
          </div>
        ))}
      </div>

      {/* Snapshot Viewer Panel */}
      {selectedGhatForSnapshot && (
        <div style={{
          position: "absolute",
          right: 10,
          top: 100,
          width: 380,
          maxHeight: 600,
          background: "rgba(0,0,0,0.95)",
          border: "2px solid #00ff00",
          borderRadius: 12,
          padding: 16,
          zIndex: 1000,
          color: "white",
          boxShadow: "0 0 30px rgba(0,255,0,0.3)",
          transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
        }}>
          {/* Header */}
          <div 
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragStartRef.current = { startX: e.clientX - dragPos.x, startY: e.clientY - dragPos.y };
              setIsDragging(true);
            }}
            onPointerMove={(e) => {
              if (!isDragging || !dragStartRef.current) return;
              setDragPos({ x: e.clientX - dragStartRef.current.startX, y: e.clientY - dragStartRef.current.startY });
            }}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId);
              setIsDragging(false);
              dragStartRef.current = null;
            }}
            style={{display: "flex", justifyContent: "space-between", marginBottom: 12, cursor: isDragging ? "grabbing" : "grab", userSelect: "none"}}
          >
            <h3 style={{margin: 0, fontSize: 16, color: "#00ff00", pointerEvents: "none"}}>
              📸 {selectedGhatForSnapshot.name}
            </h3>
            <button 
              onPointerDown={(e) => {
                e.stopPropagation();
                setSelectedGhatForSnapshot(null);
                setSelected(null);
                setPopupOpen(false);
                setDragPos({x:0, y:0});
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setSelectedGhatForSnapshot(null);
                setSelected(null);
                setPopupOpen(false);
                setDragPos({x:0, y:0});
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setSelectedGhatForSnapshot(null);
                setSelected(null);
                setPopupOpen(false);
                setDragPos({x:0, y:0});
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedGhatForSnapshot(null);
                setSelected(null);
                setPopupOpen(false);
                setDragPos({x:0, y:0});
              }}
              style={{background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, zIndex: 9999, position: "relative"}}>
              ✕
            </button>
          </div>

          {(status === "stopped" || status === "idle" || !status) ? (
            <div className="flex flex-col items-center justify-center p-6 text-center h-48 border border-white/10 rounded-lg bg-black/40">
              <p className="text-gray-400 text-sm">No live detection running for this ghat.</p>
            </div>
          ) : (
            <>
              {/* Snapshot */}
              {liveSnapshot ? (
                <div style={{position: "relative", marginBottom: 12}}>
                  <div style={{position: "absolute", top: 0, left: 0, background: "rgba(0,0,0,0.8)", padding: "2px 6px", fontSize: 10, color: "#00ff00", zIndex: 10}}>
                    Person count: {headcount}
                  </div>
                  <img 
                    src={liveSnapshot} 
                    alt="Live Snapshot" 
                    style={{width: "100%", borderRadius: 6, display: "block", minHeight: 200, objectFit: "cover"}} 
                  />
                </div>
              ) : (
                <div style={{width: "100%", height: 200, background: "#111", borderRadius: 6, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#666"}}>
                  Loading live feed...
                </div>
              )}

              {/* Stats */}
              <div style={{background: "rgba(0,255,0,0.1)", padding: 10, borderRadius: 6, marginBottom: 12}}>
                <div style={{fontSize: 24, fontWeight: "bold", color: "#00ff00", marginBottom: 6}}>
                  {headcount} People
                </div>
                <div style={{fontSize: 12, color: "#aaa", display: "flex", alignItems: "center", gap: 6}}>
                  Status: <span style={{color: statusColor}}>{status || "safe"}</span>
                </div>
                <div style={{fontSize: 10, color: "#888", marginTop: 6, display: "flex", alignItems: "center", gap: 4}}>
                  <span>🔄</span> Updated: {lastUpdated} (every 15s)
                </div>
              </div>
              <button 
                onClick={toggleSubscription}
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: isSubscribed ? "rgba(255,0,0,0.15)" : "rgba(0,255,0,0.15)",
                  color: isSubscribed ? "#ff6b6b" : "#4ade80",
                  border: `1px solid ${isSubscribed ? "#ff6b6b" : "#4ade80"}`
                }}
              >
                {isSubscribed ? "🔕 Unsubscribe from Alerts" : "🔔 Notify Me for This Ghat"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
