export const DOCTOR_NAMES_STORAGE_KEY = "queue-display:doctor-names";
export const DOCTOR_NAMES_UPDATED_EVENT = "queue-display-doctor-names";

export const DEFAULT_DOCTOR_NAMES = ["常健康", "常開心", "常快樂", "常輕鬆"];

function normalizeNames(input: unknown) {
  if (!Array.isArray(input)) return null;
  const names = input.map((name) => (typeof name === "string" ? name.trim() : "")).slice(0, 4);
  while (names.length < 4) names.push("");
  return names;
}

export function loadDoctorNames() {
  if (typeof window === "undefined") return DEFAULT_DOCTOR_NAMES;
  try {
    const raw = window.localStorage.getItem(DOCTOR_NAMES_STORAGE_KEY);
    if (!raw) return DEFAULT_DOCTOR_NAMES;
    const parsed = JSON.parse(raw);
    const normalized = normalizeNames(parsed);
    if (!normalized) return DEFAULT_DOCTOR_NAMES;
    return normalized.map((name, idx) => name || DEFAULT_DOCTOR_NAMES[idx]);
  } catch {
    return DEFAULT_DOCTOR_NAMES;
  }
}

export function saveDoctorNames(names: string[]) {
  if (typeof window === "undefined") return;
  const normalized = normalizeNames(names) ?? DEFAULT_DOCTOR_NAMES;
  window.localStorage.setItem(DOCTOR_NAMES_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(DOCTOR_NAMES_UPDATED_EVENT));
}

