export type StationKey = "dr" | "nurse" | "pharmacy" | "lab";

export type StationOption = {
  key: StationKey;
  labelEn: string;
  labelZh: string;
};

const LAST_STATION_STORAGE_KEY = "queue-display:last-station";

export const STATIONS: StationOption[] = [
  { key: "dr", labelEn: "Doctor Station", labelZh: "醫生站" },
  { key: "nurse", labelEn: "Nurse Station", labelZh: "護士分流站" },
  { key: "pharmacy", labelEn: "Pharmacy", labelZh: "藥房" },
  { key: "lab", labelEn: "Lab", labelZh: "檢驗" },
];

export function formatStationLabel(station: StationOption) {
  return `${station.labelEn} ${station.labelZh}`;
}

export function isStationKey(value: string): value is StationKey {
  return value === "dr" || value === "nurse" || value === "pharmacy" || value === "lab";
}

export function getStationOption(stationKey: StationKey): StationOption {
  const station = STATIONS.find((s) => s.key === stationKey);
  if (!station) {
    return STATIONS[0];
  }
  return station;
}

export function getLastStation(defaultStation: StationKey = "dr"): StationKey {
  if (typeof window === "undefined") return defaultStation;
  const saved = window.localStorage.getItem(LAST_STATION_STORAGE_KEY);
  return saved && isStationKey(saved) ? saved : defaultStation;
}

export function setLastStation(station: StationKey) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_STATION_STORAGE_KEY, station);
}
