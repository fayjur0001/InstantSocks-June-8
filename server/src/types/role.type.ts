export const roles = ["general", "support", "admin", "super admin"] as const;
export type Role = (typeof roles)[number];