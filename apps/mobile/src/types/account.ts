export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarInitials: string;
}

export const INITIAL_ACCOUNTS: UserAccount[] = [];
