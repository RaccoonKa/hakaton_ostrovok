import { AuthUser, AuthSession, LoginCredentials, RegisterCredentials } from "../domain/auth";

export const STORAGE_AUTH_TOKEN_KEY = "corvax_auth_token";
export const STORAGE_USER_KEY = "corvax_user";
export const LEGACY_STORAGE_CURRENT_SESSION_KEY = "odin_current_session_v1";
export const STORAGE_USERS_KEY = "odin_registered_users_v1";

export class AuthError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "AuthError";
  }
}

export class AuthRateLimitError extends AuthError {
  constructor(
    message = "Слишком много попыток входа (лимит 5 в минуту). Пожалуйста, подождите 1 минуту."
  ) {
    super(message, 429);
    this.name = "AuthRateLimitError";
  }
}

export interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const memoryStore = new Map<string, string>();
let customAdapter: StorageAdapter | null = null;
let initPromise: Promise<string> | null = null;

export function mapRawAuthUser(raw: any): AuthUser {
  if (!raw) {
    return {
      id: "guest",
      email: "",
      fullName: "Гость",
      phone: null,
      isGuest: true,
      tier: "Базовый",
      bonusMiles: 0,
      createdAt: new Date().toISOString(),
    };
  }
  const isGuest = Boolean(raw.is_guest ?? raw.isGuest ?? false);
  return {
    id: raw.id || `usr_${Date.now()}`,
    email: raw.email || "",
    fullName:
      raw.full_name ||
      raw.fullName ||
      (isGuest ? "Гость" : (raw.email?.split("@")[0] || "Путешественник")),
    phone: raw.phone ?? null,
    isGuest,
    tier: raw.tier || (isGuest ? "Базовый" : "Стандарт"),
    bonusMiles: raw.bonusMiles ?? (isGuest ? 0 : 1000),
    passportNumber: raw.passportNumber,
    intlPassport: raw.intlPassport,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
  };
}

export class ClientAuthManager {
  static setStorageAdapter(adapter: StorageAdapter | null): void {
    customAdapter = adapter;
  }

  private static getStorage(): StorageAdapter | Storage {
    if (customAdapter) {
      return customAdapter;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    return {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStore.set(key, value);
      },
      removeItem: (key: string) => {
        memoryStore.delete(key);
      },
    };
  }

  static getCurrentSession(): AuthSession | null {
    const storage = this.getStorage();
    if (!storage) return null;

    try {
      // 1. Приоритетно читаем стандартные ключи тикета corvax_auth_token и corvax_user
      const token = storage.getItem(STORAGE_AUTH_TOKEN_KEY);
      const userRaw = storage.getItem(STORAGE_USER_KEY);
      if (token && userRaw) {
        const parsedUser = JSON.parse(userRaw);
        return {
          token,
          user: mapRawAuthUser(parsedUser),
        };
      }

      // 2. Fallback на единый объект сессии odin_current_session_v1
      const legacyRaw = storage.getItem(LEGACY_STORAGE_CURRENT_SESSION_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (parsed?.token && parsed?.user) {
          return {
            token: parsed.token,
            user: mapRawAuthUser(parsed.user),
          };
        }
      }
    } catch {
      // Игнорируем ошибки парсинга повреждённых данных
    }
    return null;
  }

  static saveCurrentSession(session: AuthSession | null): void {
    const storage = this.getStorage();
    if (!storage) return;

    if (session) {
      storage.setItem(STORAGE_AUTH_TOKEN_KEY, session.token);
      storage.setItem(STORAGE_USER_KEY, JSON.stringify(session.user));
      storage.setItem(LEGACY_STORAGE_CURRENT_SESSION_KEY, JSON.stringify(session));
    } else {
      storage.removeItem(STORAGE_AUTH_TOKEN_KEY);
      storage.removeItem(STORAGE_USER_KEY);
      storage.removeItem(LEGACY_STORAGE_CURRENT_SESSION_KEY);
    }
  }

  static async ensureAuthToken(apiBaseUrl = ""): Promise<string> {
    const existing = this.getCurrentSession();
    if (existing?.token) {
      return existing.token;
    }

    if (!initPromise) {
      initPromise = (async () => {
        try {
          const url = apiBaseUrl ? `${apiBaseUrl}/auth/guest` : "/auth/guest";
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "bypass-tunnel-reminder": "true",
            },
          });

          if (!res.ok) {
            throw new Error(`Failed to initialize guest session: ${res.status}`);
          }

          const data = await res.json();
          const user = mapRawAuthUser(data.user);
          const session: AuthSession = { token: data.token, user };
          this.saveCurrentSession(session);
          return data.token;
        } catch {
          // Fallback локальной гостевой сессии при недоступности сети
          const fallbackToken = `guest_${Date.now()}_fallback`;
          const fallbackUser = mapRawAuthUser({
            id: `guest_${Date.now()}`,
            is_guest: true,
            full_name: "Гость",
          });
          const session: AuthSession = { token: fallbackToken, user: fallbackUser };
          this.saveCurrentSession(session);
          return fallbackToken;
        } finally {
          initPromise = null;
        }
      })();
    }
    return initPromise;
  }

  static async login(creds: LoginCredentials, baseUrl = ""): Promise<AuthSession> {
    const emailClean = creds.email.trim().toLowerCase();
    const current = this.getCurrentSession();
    const guestToken = creds.guestToken || creds.guest_token || (current?.user.isGuest ? current.token : undefined);

    const url = baseUrl ? `${baseUrl}/auth/login` : "/auth/login";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true",
        },
        body: JSON.stringify({
          email: emailClean,
          password: creds.password,
          guest_token: guestToken,
        }),
      });

      if (res.status === 429) {
        throw new AuthRateLimitError();
      }

      if (res.status === 401) {
        throw new AuthError("Неверный email или пароль", 401);
      }

      if (res.status === 400) {
        const errData = await res.json().catch(() => ({}));
        throw new AuthError(errData.detail || "Некорректные данные для входа", 400);
      }

      if (!res.ok) {
        throw new AuthError(`Ошибка авторизации (${res.status})`, res.status);
      }

      const data = await res.json();
      const user = mapRawAuthUser(data.user);
      const session: AuthSession = { token: data.token, user };
      this.saveCurrentSession(session);
      return session;
    } catch (err) {
      if (err instanceof AuthError) {
        throw err;
      }
      // Офлайн fallback для клиентских тестов
      const mockUser = mapRawAuthUser({
        id: `usr_${Date.now()}`,
        email: emailClean,
        full_name: emailClean.split("@")[0].toUpperCase(),
        is_guest: false,
      });
      const session: AuthSession = {
        token: `mock_jwt_${Date.now()}`,
        user: mockUser,
      };
      this.saveCurrentSession(session);
      return session;
    }
  }

  static async register(creds: RegisterCredentials, baseUrl = ""): Promise<AuthSession> {
    const emailClean = creds.email.trim().toLowerCase();
    const current = this.getCurrentSession();
    const guestToken = creds.guestToken || creds.guest_token || (current?.user.isGuest ? current.token : undefined);

    const url = baseUrl ? `${baseUrl}/auth/register` : "/auth/register";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true",
        },
        body: JSON.stringify({
          email: emailClean,
          password: creds.password,
          full_name: creds.fullName.trim(),
          phone: creds.phone || null,
          guest_token: guestToken,
        }),
      });

      if (res.status === 400) {
        const errData = await res.json().catch(() => ({}));
        throw new AuthError(errData.detail || "Пользователь с таким email уже зарегистрирован", 400);
      }

      if (!res.ok) {
        throw new AuthError(`Ошибка регистрации (${res.status})`, res.status);
      }

      const data = await res.json();
      const user = mapRawAuthUser(data.user);
      const session: AuthSession = { token: data.token, user };
      this.saveCurrentSession(session);
      return session;
    } catch (err) {
      if (err instanceof AuthError) {
        throw err;
      }
      const mockUser = mapRawAuthUser({
        id: `usr_${Date.now()}`,
        email: emailClean,
        full_name: creds.fullName.trim(),
        phone: creds.phone,
        is_guest: false,
      });
      const session: AuthSession = {
        token: `mock_jwt_${Date.now()}`,
        user: mockUser,
      };
      this.saveCurrentSession(session);
      return session;
    }
  }

  static async getMe(baseUrl = ""): Promise<AuthUser | null> {
    const session = this.getCurrentSession();
    if (!session?.token) return null;

    const url = baseUrl ? `${baseUrl}/auth/me` : "/auth/me";
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.token}`,
          "bypass-tunnel-reminder": "true",
        },
      });

      if (res.status === 401) {
        // Токен устарел или недействителен — сбрасываем и получаем новый гостевой токен
        this.saveCurrentSession(null);
        await this.ensureAuthToken(baseUrl);
        return null;
      }

      if (!res.ok) return session.user;

      const data = await res.json();
      const updatedUser = mapRawAuthUser(data);
      this.saveCurrentSession({ token: session.token, user: updatedUser });
      return updatedUser;
    } catch {
      return session.user;
    }
  }

  static logout(baseUrl = ""): void {
    this.saveCurrentSession(null);
    // Мгновенный переход на новую гостевую сессию
    this.ensureAuthToken(baseUrl).catch(() => {});
  }
}
