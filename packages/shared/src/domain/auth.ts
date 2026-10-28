export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  tier: "Базовый" | "Стандарт" | "Премиум" | "Бизнес";
  bonusMiles?: number;
  passportNumber?: string;
  intlPassport?: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
