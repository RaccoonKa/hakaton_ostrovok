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

export const INITIAL_ACCOUNTS: UserAccount[] = [
  {
    id: "acc-1",
    name: "Алексей Смирнов",
    email: "alexey.smirnov@example.com",
    phone: "+7 (999) 123-45-67",
    tier: "Премиум",
    bonusMiles: 14500,
    passportNumber: "4512 789123",
    intlPassport: "75 №1234567",
    avatarInitials: "АС",
    badgeColor: "#8B5CF6",
  },
  {
    id: "acc-2",
    name: "Екатерина Смирнова",
    email: "ekaterina.s@example.com",
    phone: "+7 (916) 555-43-21",
    tier: "Стандарт",
    bonusMiles: 4200,
    passportNumber: "4516 432198",
    intlPassport: "76 №8901234",
    avatarInitials: "ЕС",
    badgeColor: "#059669",
  },
  {
    id: "acc-3",
    name: "ООО «Корвакс Технологии»",
    email: "corp@corvax.ru",
    phone: "+7 (495) 777-88-99",
    tier: "Бизнес",
    bonusMiles: 85000,
    passportNumber: "ИНН 7701234567",
    avatarInitials: "КТ",
    badgeColor: "#2563EB",
  },
];
