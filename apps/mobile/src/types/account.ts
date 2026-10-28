export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: "Премиум" | "Стандарт" | "Бизнес" | "Базовый";
  bonusMiles: number;
  passportNumber?: string;
  intlPassport?: string;
  avatarInitials: string;
  badgeColor?: string;
}

export const INITIAL_ACCOUNTS: UserAccount[] = [];
