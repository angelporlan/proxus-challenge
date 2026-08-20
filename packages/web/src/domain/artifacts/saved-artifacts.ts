import { useEffect, useState } from "react";

const STORAGE_KEY = "proxus_saved_artifact_ids";
const CHANGE_EVENT = "proxus_saved_artifacts_changed";

function readSavedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id): id is string => typeof id === "string"));
    }
    return new Set();
  } catch {
    return new Set();
  }
}

function writeSavedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export function isArtifactSaved(id: string): boolean {
  return readSavedIds().has(id);
}

export function setArtifactSaved(id: string, saved: boolean): void {
  const current = readSavedIds();
  if (saved) {
    current.add(id);
  } else {
    current.delete(id);
  }
  writeSavedIds(current);
}

export function toggleArtifactSaved(id: string): boolean {
  const current = readSavedIds();
  const willSave = !current.has(id);
  if (willSave) {
    current.add(id);
  } else {
    current.delete(id);
  }
  writeSavedIds(current);
  return willSave;
}

export function useSavedArtifactIds(): Set<string> {
  const [savedIds, setSavedIds] = useState<Set<string>>(() => readSavedIds());

  useEffect(() => {
    const handleUpdate = () => {
      setSavedIds(readSavedIds());
    };

    window.addEventListener(CHANGE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(CHANGE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return savedIds;
}
