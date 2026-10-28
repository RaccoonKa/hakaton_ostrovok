export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  isGuest: boolean;
  tier?: "Базовый" | "Стандарт" | "Премиум" | "Бизнес";
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
  phone?: string | null;
  guestToken?: string;
  guest_token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  guestToken?: string;
  guest_token?: string;
}
