export type Status = "safe" | "moderate" | "critical";

export interface Ghat {
  id: string;
  name: string;
  district: string;
  riverSide: string;
  cameraId: string;
  streamUrl?: string;
  latitude: number;
  longitude: number;
  maximumCapacity: number;
  currentPeople: number;
  occupancyPercentage: number;
  status: Status;
  cameraHealth: "online" | "offline";
  lastUpdated: string;
}

export interface AlertItem {
  id: string;
  ghatId: string;
  ghatName: string;
  level: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
}

export interface HistoryPoint {
  ghatId: string;
  timestamp: string;
  people: number;
  occupancy: number;
}

export interface CameraUpdate {
  camera_id: string;
  people_count: number;
  timestamp: string;
}
