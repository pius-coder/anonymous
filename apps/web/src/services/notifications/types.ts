export type NotificationEntry = {
  id: string;
  type: string;
  status: string;
  title: string;
  body: string;
  createdAt: string;
};

export type NotificationPreferences = {
  email: boolean;
  sms: boolean;
  push: boolean;
};
