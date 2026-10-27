import { AuthUser, AuthSession, LoginCredentials, RegisterCredentials } from "../domain/auth";

const STORAGE_USERS_KEY = "odin_registered_users_v1";
const STORAGE_CURRENT_SESSION_KEY = "odin_current_session_v1";

const DEFAULT_USERS: AuthUser[] = [];

export class ClientAuthManager {
  private static getStorage(): Storage | null {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  static getUsers(): AuthUser[] {
    const storage = this.getStorage();
    if (!storage) return DEFAULT_USERS;
    try {
      const raw = storage.getItem(STORAGE_USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_USERS;
  }

  static saveUsers(users: AuthUser[]): void {
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    }
  }

  static getCurrentSession(): AuthSession | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }
    try {
      const raw = storage.getItem(STORAGE_CURRENT_SESSION_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // fallback
    }
    return null;
  }

  static saveCurrentSession(session: AuthSession | null): void {
    const storage = this.getStorage();
    if (storage) {
      if (session) {
        storage.setItem(STORAGE_CURRENT_SESSION_KEY, JSON.stringify(session));
      } else {
        storage.removeItem(STORAGE_CURRENT_SESSION_KEY);
      }
    }
  }

  static async login(creds: LoginCredentials, baseUrl = ""): Promise<AuthSession> {
    const emailClean = creds.email.trim().toLowerCase();

    // 1. Попытка запроса к реальному бэкенду (когда бэкенд команда напишет эндпоинты)
    if (baseUrl) {
      try {
        const res = await fetch(`${baseUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailClean, password: creds.password }),
        });
        if (res.ok) {
          const data = await res.json();
          const session: AuthSession = { token: data.token, user: data.user };
          this.saveCurrentSession(session);
          return session;
        }
      } catch {
        // Бэкенд ещё не готов или офлайн — используем клиентскую авторизацию
      }
    }

    // 2. Клиентская авторизация
    const users = this.getUsers();
    let found = users.find((u) => u.email.toLowerCase() === emailClean);

    if (!found) {
      // Авто-создание профиля для удобства тестирования
      found = {
        id: `usr_${Date.now()}`,
        email: emailClean,
        fullName: emailClean.split("@")[0].toUpperCase(),
        phone: "+7 (999) 000-00-00",
        tier: "Стандарт",
        bonusMiles: 1000,
        createdAt: new Date().toISOString(),
      };
      this.saveUsers([...users, found]);
    }

    const session: AuthSession = {
      token: `tok_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      user: found,
    };
    this.saveCurrentSession(session);
    return session;
  }

  static async register(creds: RegisterCredentials, baseUrl = ""): Promise<AuthSession> {
    const emailClean = creds.email.trim().toLowerCase();

    // 1. Попытка запроса к реальному бэкенду
    if (baseUrl) {
      try {
        const res = await fetch(`${baseUrl}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailClean,
            password: creds.password,
            full_name: creds.fullName,
            phone: creds.phone,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const session: AuthSession = { token: data.token, user: data.user };
          this.saveCurrentSession(session);
          return session;
        }
      } catch {
        // fallback
      }
    }

    // 2. Клиентская регистрация
    const users = this.getUsers();
    const newUser: AuthUser = {
      id: `usr_${Date.now()}`,
      email: emailClean,
      fullName: creds.fullName.trim(),
      phone: creds.phone?.trim() || "+7 (999) 000-00-00",
      tier: "Стандарт",
      bonusMiles: 1000,
      createdAt: new Date().toISOString(),
    };

    const updated = users.filter((u) => u.email.toLowerCase() !== emailClean);
    updated.push(newUser);
    this.saveUsers(updated);

    const session: AuthSession = {
      token: `tok_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      user: newUser,
    };
    this.saveCurrentSession(session);
    return session;
  }

  static logout(baseUrl = ""): void {
    const session = this.getCurrentSession();
    if (session && baseUrl) {
      fetch(`${baseUrl}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => {});
    }
    this.saveCurrentSession(null);
  }
}
