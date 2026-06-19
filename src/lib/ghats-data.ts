import type { Ghat } from "./types";

// Real Godavari ghats with approximate coordinates
export const INITIAL_GHATS: Ghat[] = [
  { id: "g1",  name: "Pushkar Ghat",        district: "East Godavari", riverSide: "South", cameraId: "CAM-001", latitude: 16.9891, longitude: 81.7842, maximumCapacity: 5000, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "online",  lastUpdated: new Date().toISOString() },
  { id: "g2",  name: "Kotilingala Ghat",    district: "East Godavari", riverSide: "South", cameraId: "CAM-002", latitude: 16.9905, longitude: 81.7799, maximumCapacity: 4500, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "online",  lastUpdated: new Date().toISOString() },
  { id: "g3",  name: "ISKCON Ghat",         district: "East Godavari", riverSide: "South", cameraId: "CAM-003", latitude: 16.9856, longitude: 81.7891, maximumCapacity: 3000, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "online",  lastUpdated: new Date().toISOString() },
  { id: "g4",  name: "Saraswati Ghat",      district: "East Godavari", riverSide: "South", cameraId: "CAM-004", latitude: 16.9820, longitude: 81.7920, maximumCapacity: 3500, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "online",  lastUpdated: new Date().toISOString() },
  { id: "g5",  name: "Markandeya Ghat",     district: "East Godavari", riverSide: "South", cameraId: "CAM-005", latitude: 16.9938, longitude: 81.7750, maximumCapacity: 2500, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "online",  lastUpdated: new Date().toISOString() },
  { id: "g6",  name: "Dowleswaram Ghat",    district: "East Godavari", riverSide: "South", cameraId: "CAM-006", latitude: 16.9430, longitude: 81.7780, maximumCapacity: 4000, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "online",  lastUpdated: new Date().toISOString() },
  { id: "g7",  name: "Kovvur Ghat",         district: "West Godavari", riverSide: "North", cameraId: "CAM-007", latitude: 17.0156, longitude: 81.7350, maximumCapacity: 3800, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "online",  lastUpdated: new Date().toISOString() },
  { id: "g8",  name: "Yanam Ghat",          district: "Yanam",         riverSide: "East",  cameraId: "CAM-008", latitude: 16.7305, longitude: 82.2170, maximumCapacity: 2800, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "online",  lastUpdated: new Date().toISOString() },
  { id: "g9",  name: "Nidadavole Ghat",     district: "West Godavari", riverSide: "North", cameraId: "CAM-009", latitude: 16.9100, longitude: 81.6700, maximumCapacity: 2200, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "offline", lastUpdated: new Date().toISOString() },
  { id: "g10", name: "Bhadrachalam Ghat",   district: "Bhadradri",     riverSide: "North", cameraId: "CAM-010", latitude: 17.6688, longitude: 80.8881, maximumCapacity: 6000, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "online",  lastUpdated: new Date().toISOString() },
  { id: "g11", name: "Rajamahendravaram Old Ghat", district: "East Godavari", riverSide: "South", cameraId: "CAM-011", latitude: 16.9870, longitude: 81.7810, maximumCapacity: 4200, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "online",  lastUpdated: new Date().toISOString() },
  { id: "g12", name: "Polavaram Ghat",      district: "West Godavari", riverSide: "North", cameraId: "CAM-012", latitude: 17.2510, longitude: 81.6420, maximumCapacity: 3300, currentPeople: 0, occupancyPercentage: 0, status: "safe", cameraHealth: "online",  lastUpdated: new Date().toISOString() },
];

export function computeStatus(occ: number): "safe" | "moderate" | "critical" {
  if (occ >= 80) return "critical";
  if (occ >= 60) return "moderate";
  return "safe";
}
