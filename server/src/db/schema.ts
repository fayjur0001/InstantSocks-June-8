import { roles } from "@/types/role.type";
import {
  boolean, index, integer, pgEnum, pgTable,
  real, serial, text, timestamp, varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdateFn(() => new Date()),
};

export const UserRoleEnum = pgEnum("role", roles);
export const UserModel = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username").notNull().unique(),
  email: varchar("email").notNull().unique(),
  jabber_dep: varchar("jabber"),
  telegram_dep: varchar("telegram"),
  pinCode: text("pin_code"),
  isOnline: boolean("is_online").notNull().default(false),
  role: UserRoleEnum("role").notNull().default("general"),
  password: text("password").notNull(),
  banned: boolean("banned").notNull().default(false),
  bannedTill: timestamp("banned_till"),
  agentSerial: integer("agent_serial").unique(),
  ...timestamps,
}, (table) => ({
  usernameIdx: index("users_username_idx").on(table.username),
  emailIdx: index("users_email_idx").on(table.email),
  jabberIdx: index("users_jabber_idx").on(table.jabber_dep),
  telegramIdx: index("users_telegram_idx").on(table.telegram_dep),
}));
export const AdditionalUserInformationModel = pgTable("additional_user_information", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => UserModel.id),
  firstName: varchar("first_name"),
  nickName: varchar("nick_name"),
  lastName: varchar("last_name"),
  website: varchar("website"),
  telegram: varchar("telegram"),
  jabber: varchar("jabber"),
  profilePicture: text("profile_image"),
  bio: varchar("bio"),
  ...timestamps,
});
export const UserDeviceModel = pgTable("user_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  token: varchar("token").notNull().unique(),
  ...timestamps,
}, (table) => ({
  tokenIdx: index("user_devices_token_idx").on(table.token),
  userIdIdx: index("user_devices_user_id_idx").on(table.userId),
}));
export const SiteOptionModel = pgTable("site_options", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  value: text("value"),
  ...timestamps,
});
export const addedFundStatusEnum = pgEnum("status", ["pending", "approved", "rejected"]);
export const paymentMethodEnum = pgEnum("payment_method", ["blockonomics", "now_payments", "yaan_pay"]);
export const AddedFundModel = pgTable("added_funds", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  txid: varchar("txid"),
  amount: real("amount").notNull(),
  status: addedFundStatusEnum("status").notNull().default("pending"),
  walletAddress: varchar("wallet_address").notNull(),
  currency: varchar("currency").notNull().default("BTC"),
  method: paymentMethodEnum("method").notNull().default("blockonomics"),
  manualyUploaded: boolean("manualy_uploaded").notNull().default(false),
  ...timestamps,
});
export const ticketStatusEnum = pgEnum("ticket_status", ["opened", "closed"]);
export const TicketModel = pgTable("tickets", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  agentId: integer("agent_id").references(() => UserModel.id),
  subject: varchar("subject").notNull(),
  category: varchar("category"),
  status: ticketStatusEnum("status").notNull().default("opened"),
  ...timestamps,
});
export const TicketMessageModel = pgTable("ticket_messages", {
  id: serial("id").primaryKey().notNull(),
  ticketId: integer("ticket_id").notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  message: varchar("message").notNull(),
  ...timestamps,
});
export const TicketMessageSeenByModel = pgTable("ticket_message_seen_bys", {
  id: serial("id").primaryKey().notNull(),
  messageId: integer("message_id").notNull().references(() => TicketMessageModel.id),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  ...timestamps,
});
export const RentStatusEnum = pgEnum("rent_status", ["Reserved","Awaiting MDN","Active","Expired","Rejected","Completed","Timed Out"]);
export const OneTimeRentModel = pgTable("one_time_rents", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  requestId: text("request_id").notNull(),
  mdn: varchar("mdn").notNull(),
  service: varchar("service").notNull(),
  status: RentStatusEnum("status").notNull(),
  state: varchar("state").notNull(),
  price: real("price").notNull(),
  originalPrice: real("original_price").notNull(),
  carrier: varchar("carrier").notNull(),
  message: text("message"),
  pin: text("pin"),
  tillExpiration: integer("till_expiration").notNull(),
  ...timestamps,
});
export const OnlineStatusEnum = pgEnum("online_status", ["awaiting mdn","online","offline"]);
export const longTermRentTypeEnum = pgEnum("rent_type", ["short","regular","unlimited"]);
export const LongTermRentsModel = pgTable("long_term_rents", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  requestId: text("request_id").notNull(),
  mdn: varchar("mdn").notNull(),
  service: varchar("service").notNull(),
  status: RentStatusEnum("status").notNull(),
  price: real("price").notNull(),
  message: text("message"),
  pin: text("pin"),
  expirationDate: timestamp("expiration_date", { mode: "date" }).notNull(),
  onlineStatus: OnlineStatusEnum("online_status").notNull(),
  rentType: longTermRentTypeEnum("rent_type").notNull(),
  ...timestamps,
});
export const MDNTypeEnum = pgEnum("mdn_type", ["one_time","long_term"]);
export const MDNMessageModel = pgTable("mdn_messages", {
  id: serial("id").primaryKey().notNull(),
  requestId: varchar("request_id").notNull(),
  timestamp: timestamp("timestamp", { mode: "date" }).notNull(),
  from: varchar("from").notNull(),
  to: varchar("to").notNull(),
  reply: varchar("reply").notNull(),
  pin: varchar("pin"),
  type: MDNTypeEnum("type").notNull(),
  ...timestamps,
});
export const ProxyTypeEnum = pgEnum("proxy_type", ["shared","exclusive"]);
export const RentedProxyModel = pgTable("rented_proxies", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  requestId: varchar("request_id").notNull(),
  port: varchar("port").notNull(),
  proxyCarrier: varchar("proxy_carrier").notNull(),
  proxyUser: varchar("proxy_user").notNull(),
  proxyPass: varchar("proxy_pass").notNull(),
  proxyIp: varchar("proxy_ip").notNull(),
  proxySocksPort: integer("proxy_socks_port").notNull(),
  proxyHttpPort: integer("proxy_http_port").notNull(),
  price: real("price").notNull(),
  proxyType: ProxyTypeEnum("proxy_type").notNull(),
  expirationDate: timestamp("expiration_date", { mode: "date" }).notNull(),
  service: varchar("service").notNull(),
  ...timestamps,
});
export const DeviceTransactionModel = pgTable("device_transactions", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  line: varchar("line").notNull(),
  price: real("price").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  ...timestamps,
});
export const PasswordResetRequestModel = pgTable("password_reset_requests", {
  id: serial("id").primaryKey().notNull(),
  email: varchar("email").notNull(),
  selector: varchar("selector").notNull(),
  token: varchar("token").notNull(),
  ...timestamps,
});
export const Socks5ProxyCartModel = pgTable("socks5_proxy_cart", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  proxyId: varchar("proxy_id").notNull(),
  price: real("price").notNull(),
  originalPrice: real("original_price").notNull(),
  ...timestamps,
}, (table) => ({
  userIdIdx: index("socks5_cart_user_id_idx").on(table.userId),
}));
export const Socks5AuthModel = pgTable("socks5_auth", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id).unique(),
  username: varchar("username").notNull(),
  password: varchar("password").notNull(),
  ...timestamps,
});
export const Socks5ProxyTransactionModel = pgTable("socks5_proxy_transactions", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  port: varchar("port").notNull(),
  note: varchar("note"),
  originalPrice: real("original_price").notNull(),
  price: real("price").notNull(),
  country: varchar("country").notNull(),
  ip: varchar("ip").notNull(),
  state: varchar("state").notNull(),
  city: varchar("city").notNull(),
  zip: varchar("zip").notNull(),
  type: varchar("type").notNull(),
  auth: varchar("auth").notNull(),
  ...timestamps,
});
export const SMSPVAFavoriteCountryModel = pgTable("sms_pva_favorite_countries", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  ...timestamps,
}, (table) => ({
  userIdIdx: index("sms_pva_fav_country_user_idx").on(table.userId),
}));
export const SMSPVAFavoriteServiceModel = pgTable("sms_pva_favorite_services", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  serviceId: varchar("service_id").notNull(),
  ...timestamps,
}, (table) => ({
  userIdIdx: index("sms_pva_fav_service_user_idx").on(table.userId),
  serviceIdIdx: index("sms_pva_fav_service_id_idx").on(table.serviceId),
}));
export const SMSPVAOneTimeRentModel = pgTable("sms_pva_one_time_rents", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  requestId: text("request_id").notNull(),
  mdn: varchar("mdn").notNull(),
  service: varchar("service").notNull(),
  status: RentStatusEnum("status").notNull(),
  price: real("price").notNull(),
  originalPrice: real("original_price").notNull(),
  message: text("message"),
  pin: text("pin"),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  ...timestamps,
});
export const SMSPVALongTermRentModel = pgTable("sms_pva_long_term_rents", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => UserModel.id),
  requestId: text("request_id").notNull(),
  mdn: varchar("mdn").notNull(),
  service: varchar("service").notNull(),
  status: RentStatusEnum("status").notNull(),
  price: real("price").notNull(),
  originalPrice: real("original_price").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  ...timestamps,
});

// ─── Discount Tiers ───────────────────────────────────────────────────────────
// Admin-configurable badge tiers.
// Badge is derived at runtime by summing approved top-ups for a user and
// finding which tier their total falls into — no column needed on `users`.
// Discount is applied at add-to-cart time so the saved cart price is final.
export const DiscountTierModel = pgTable("discount_tiers", {
  id:        serial("id").primaryKey().notNull(),
  // e.g. "Basic" | "Bronze" | "Silver" | "Gold" | "Diamond"
  tier:      varchar("tier", { length: 32 }).notNull().unique(),
  // inclusive lower bound (USD). Basic = 0, never changes.
  minSpend:  real("min_spend").notNull(),
  // inclusive upper bound (USD). NULL means "unlimited" (Diamond tier).
  maxSpend:  real("max_spend"),
  // discount percentage applied to purchase price. 0 = no discount.
  discount:  real("discount").notNull().default(0),
  // display order in admin UI (Basic=1 … Diamond=5)
  sortOrder: integer("sort_order").notNull(),
  ...timestamps,
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const NotificationModel = pgTable("notifications", {
  id:        serial("id").primaryKey().notNull(),
  userId:    integer("user_id").notNull().references(() => UserModel.id),
  type:      varchar("type").notNull(),       // "proxy_rent" | "topup_approved" | "system"
  title:     varchar("title").notNull(),
  message:   varchar("message").notNull(),
  isRead:    boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
}));