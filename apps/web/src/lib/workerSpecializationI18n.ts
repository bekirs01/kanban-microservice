import type { WorkerSpecialization } from "@challenge/types";

export function workerSpecializationTranslationKey(spec: WorkerSpecialization): string {
  return `workers.spec.${spec}`;
}
