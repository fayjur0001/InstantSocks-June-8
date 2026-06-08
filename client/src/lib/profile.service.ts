import { apiFetch } from "@/lib/api";

export interface ProfileUser {
  id: number;
  username: string;
  email: string;
  role: "general" | "support" | "admin" | "super admin";
  firstName: string;
  nickName: string;
  lastName: string;
  website: string;
  telegram: string;
  jabber: string;
  bio: string;
  avatar: string;
}

export interface ProfileResponse {
  success: boolean;
  user: ProfileUser;
}

export interface UpdateProfilePayload {
  username: string;
  firstName: string;
  lastName: string;
  nickName: string;
  website: string;
  telegram: string;
  jabber: string;
  bio: string;
}

export interface ApiMessageResponse {
  success: boolean;
  message: string;
}

export const profileService = {
  getProfile: () => apiFetch("/api/auth/profile") as Promise<ProfileResponse>,

  updateProfile: (payload: UpdateProfilePayload) =>
    apiFetch("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }) as Promise<ApiMessageResponse>,

  changePassword: (oldPassword: string, newPassword: string) =>
    apiFetch("/api/auth/profile/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    }) as Promise<ApiMessageResponse>,

  changePin: (oldPin: string, newPin: string) =>
    apiFetch("/api/auth/profile/change-pin", {
      method: "POST",
      body: JSON.stringify({ oldPin, newPin }),
    }) as Promise<ApiMessageResponse>,
};

