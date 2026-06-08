import { Role } from "./role.type";

export default interface Payload {
  id: number;
  username: string;
  role: Role;
  deviceToken?: string;
  isShadowAdmin?: boolean;
  originalAdminToken?: string;
}