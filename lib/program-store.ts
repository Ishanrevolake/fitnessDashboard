import { programTemplates } from "./mock-data";
import type { ProgramTemplate } from "./types";

const storageKey = "alphaFitnessPrograms";

function clonePrograms() {
  return programTemplates.map((program) => ({ ...program }));
}

export function getStoredPrograms() {
  if (typeof window === "undefined") return clonePrograms();

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      window.localStorage.setItem(storageKey, JSON.stringify(programTemplates));
      return clonePrograms();
    }

    return JSON.parse(stored) as ProgramTemplate[];
  } catch {
    return clonePrograms();
  }
}

export function saveStoredPrograms(programs: ProgramTemplate[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(programs));
}

export function addStoredProgram(program: ProgramTemplate) {
  const programs = getStoredPrograms();
  const nextPrograms = [program, ...programs];
  saveStoredPrograms(nextPrograms);
  return nextPrograms;
}
