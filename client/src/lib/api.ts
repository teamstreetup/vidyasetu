const SIMULATED_OFFLINE_KEY = 'vidyasetu_simulated_offline';
const TOKEN_KEY = 'vidyasetu_token';

export class OfflineError extends Error {
  constructor(message = 'You are currently offline') {
    super(message);
    this.name = 'OfflineError';
  }
}

export function isSimulatedOffline(): boolean {
  return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
}

export function setSimulatedOffline(value: boolean): void {
  localStorage.setItem(SIMULATED_OFFLINE_KEY, value ? 'true' : 'false');
}

export function isEffectivelyOnline(): boolean {
  return navigator.onLine && !isSimulatedOffline();
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!isEffectivelyOnline()) {
    throw new OfflineError('No internet connection available');
  }

  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new OfflineError('Server unreachable — switched to offline mode');
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore parse failure
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
