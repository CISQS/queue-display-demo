export type StationKey = "dr" | "nurse" | "pharmacy";

export type StationOption = {
  key: StationKey;
  labelEn: string;
  labelZh: string;
};

export const STATIONS: StationOption[] = [
  { key: "dr", labelEn: "Doctor Station", labelZh: "醫生站" },
  { key: "nurse", labelEn: "Nurse Station", labelZh: "護士分流站" },
  { key: "pharmacy", labelEn: "Pharmacy", labelZh: "藥房" },
];

export function formatStationLabel(station: StationOption) {
  return `${station.labelEn} ${station.labelZh}`;
}

export function isStationKey(value: string): value is StationKey {
  return value === "dr" || value === "nurse" || value === "pharmacy";
}

export function getStationOption(stationKey: StationKey): StationOption {
  const station = STATIONS.find((s) => s.key === stationKey);
  if (!station) {
    return STATIONS[0];
  }
  return station;
}
