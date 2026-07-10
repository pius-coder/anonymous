export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  username?: string | null;
  role: string;
};
