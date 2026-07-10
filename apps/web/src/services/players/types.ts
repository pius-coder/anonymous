export type PlayerProfile = {
  id: string;
  email: string;
  name: string | null;
  username: string;
  phone: string | null;
  role: string;
  avatarUrl?: string | null;
};
