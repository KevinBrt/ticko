/** Where the browser keeps the project whose issues were shown last. */
const STORAGE_KEY = 'toppo.issues.project';

/**
 * The project whose issues the person looked at last, in this browser: the Issues screen opens
 * on it. A convenience only: storage may be unavailable (private browsing, blocked site data).
 */
export function lastProject(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function rememberProject(projectKey: string | null): void {
  try {
    if (projectKey) {
      localStorage.setItem(STORAGE_KEY, projectKey);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Nothing to remember it with: the Issues screen opens on the first project instead.
  }
}
