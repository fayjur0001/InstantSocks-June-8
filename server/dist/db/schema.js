"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = exports.SMSPVALongTermRentModel = exports.SMSPVAOneTimeRentModel = exports.SMSPVAFavoriteServiceModel = exports.SMSPVAFavoriteCountryModel = exports.Socks5ProxyTransactionModel = exports.Socks5AuthModel = exports.Socks5ProxyCartModel = exports.PasswordResetRequestModel = exports.DeviceTransactionModel = exports.RentedProxyModel = exports.ProxyTypeEnum = exports.MDNMessageModel = exports.MDNTypeEnum = exports.LongTermRentsModel = exports.longTermRentTypeEnum = exports.OnlineStatusEnum = exports.OneTimeRentModel = exports.RentStatusEnum = exports.TicketMessageSeenByModel = exports.TicketMessageModel = exports.TicketModel = exports.ticketStatusEnum = exports.AddedFundModel = exports.paymentMethodEnum = exports.addedFundStatusEnum = exports.SiteOptionModel = exports.UserDeviceModel = exports.AdditionalUserInformationModel = exports.UserModel = exports.UserRoleEnum = void 0;
const role_type_1 = require("@/types/role.type");
const pg_core_1 = require("drizzle-orm/pg-core");
const timestamps = {
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdateFn(() => new Date()),
};
exports.UserRoleEnum = (0, pg_core_1.pgEnum)("role", role_type_1.roles);
exports.UserModel = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.varchar)("username").notNull().unique(),
    email: (0, pg_core_1.varchar)("email").notNull().unique(),
    jabber_dep: (0, pg_core_1.varchar)("jabber"),
    telegram_dep: (0, pg_core_1.varchar)("telegram"),
    pinCode: (0, pg_core_1.text)("pin_code"),
    isOnline: (0, pg_core_1.boolean)("is_online").notNull().default(false),
    role: (0, exports.UserRoleEnum)("role").notNull().default("general"),
    password: (0, pg_core_1.text)("password").notNull(),
    banned: (0, pg_core_1.boolean)("banned").notNull().default(false),
    bannedTill: (0, pg_core_1.timestamp)("banned_till"),
    agentSerial: (0, pg_core_1.integer)("agent_serial").unique(),
    ...timestamps,
}, (table) => ({
    usernameIdx: (0, pg_core_1.index)("users_username_idx").on(table.username),
    emailIdx: (0, pg_core_1.index)("users_email_idx").on(table.email),
    jabberIdx: (0, pg_core_1.index)("users_jabber_idx").on(table.jabber_dep),
    telegramIdx: (0, pg_core_1.index)("users_telegram_idx").on(table.telegram_dep),
}));
exports.AdditionalUserInformationModel = (0, pg_core_1.pgTable)("additional_user_information", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().unique().references(() => exports.UserModel.id),
    firstName: (0, pg_core_1.varchar)("first_name"),
    nickName: (0, pg_core_1.varchar)("nick_name"),
    lastName: (0, pg_core_1.varchar)("last_name"),
    website: (0, pg_core_1.varchar)("website"),
    telegram: (0, pg_core_1.varchar)("telegram"),
    jabber: (0, pg_core_1.varchar)("jabber"),
    profilePicture: (0, pg_core_1.varchar)("profile_image"),
    bio: (0, pg_core_1.varchar)("bio"),
    ...timestamps,
});
exports.UserDeviceModel = (0, pg_core_1.pgTable)("user_devices", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    token: (0, pg_core_1.varchar)("token").notNull().unique(),
    ...timestamps,
}, (table) => ({
    tokenIdx: (0, pg_core_1.index)("user_devices_token_idx").on(table.token),
    userIdIdx: (0, pg_core_1.index)("user_devices_user_id_idx").on(table.userId),
}));
exports.SiteOptionModel = (0, pg_core_1.pgTable)("site_options", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name").notNull().unique(),
    value: (0, pg_core_1.text)("value"),
    ...timestamps,
});
exports.addedFundStatusEnum = (0, pg_core_1.pgEnum)("status", ["pending", "approved", "rejected"]);
exports.paymentMethodEnum = (0, pg_core_1.pgEnum)("payment_method", ["blockonomics", "now_payments", "yaan_pay"]);
exports.AddedFundModel = (0, pg_core_1.pgTable)("added_funds", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    txid: (0, pg_core_1.varchar)("txid"),
    amount: (0, pg_core_1.real)("amount").notNull(),
    status: (0, exports.addedFundStatusEnum)("status").notNull().default("pending"),
    walletAddress: (0, pg_core_1.varchar)("wallet_address").notNull(),
    currency: (0, pg_core_1.varchar)("currency").notNull().default("BTC"),
    method: (0, exports.paymentMethodEnum)("method").notNull().default("blockonomics"),
    manualyUploaded: (0, pg_core_1.boolean)("manualy_uploaded").notNull().default(false),
    ...timestamps,
});
exports.ticketStatusEnum = (0, pg_core_1.pgEnum)("ticket_status", ["opened", "closed"]);
exports.TicketModel = (0, pg_core_1.pgTable)("tickets", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    agentId: (0, pg_core_1.integer)("agent_id").references(() => exports.UserModel.id),
    subject: (0, pg_core_1.varchar)("subject").notNull(),
    status: (0, exports.ticketStatusEnum)("status").notNull().default("opened"),
    ...timestamps,
});
exports.TicketMessageModel = (0, pg_core_1.pgTable)("ticket_messages", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    ticketId: (0, pg_core_1.integer)("ticket_id").notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    message: (0, pg_core_1.varchar)("message").notNull(),
    ...timestamps,
});
exports.TicketMessageSeenByModel = (0, pg_core_1.pgTable)("ticket_message_seen_bys", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    messageId: (0, pg_core_1.integer)("message_id").notNull().references(() => exports.TicketMessageModel.id),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    ...timestamps,
});
exports.RentStatusEnum = (0, pg_core_1.pgEnum)("rent_status", ["Reserved", "Awaiting MDN", "Active", "Expired", "Rejected", "Completed", "Timed Out"]);
exports.OneTimeRentModel = (0, pg_core_1.pgTable)("one_time_rents", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    requestId: (0, pg_core_1.text)("request_id").notNull(),
    mdn: (0, pg_core_1.varchar)("mdn").notNull(),
    service: (0, pg_core_1.varchar)("service").notNull(),
    status: (0, exports.RentStatusEnum)("status").notNull(),
    state: (0, pg_core_1.varchar)("state").notNull(),
    price: (0, pg_core_1.real)("price").notNull(),
    originalPrice: (0, pg_core_1.real)("original_price").notNull(),
    carrier: (0, pg_core_1.varchar)("carrier").notNull(),
    message: (0, pg_core_1.text)("message"),
    pin: (0, pg_core_1.text)("pin"),
    tillExpiration: (0, pg_core_1.integer)("till_expiration").notNull(),
    ...timestamps,
});
exports.OnlineStatusEnum = (0, pg_core_1.pgEnum)("online_status", ["awaiting mdn", "online", "offline"]);
exports.longTermRentTypeEnum = (0, pg_core_1.pgEnum)("rent_type", ["short", "regular", "unlimited"]);
exports.LongTermRentsModel = (0, pg_core_1.pgTable)("long_term_rents", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    requestId: (0, pg_core_1.text)("request_id").notNull(),
    mdn: (0, pg_core_1.varchar)("mdn").notNull(),
    service: (0, pg_core_1.varchar)("service").notNull(),
    status: (0, exports.RentStatusEnum)("status").notNull(),
    price: (0, pg_core_1.real)("price").notNull(),
    message: (0, pg_core_1.text)("message"),
    pin: (0, pg_core_1.text)("pin"),
    expirationDate: (0, pg_core_1.timestamp)("expiration_date", { mode: "date" }).notNull(),
    onlineStatus: (0, exports.OnlineStatusEnum)("online_status").notNull(),
    rentType: (0, exports.longTermRentTypeEnum)("rent_type").notNull(),
    ...timestamps,
});
exports.MDNTypeEnum = (0, pg_core_1.pgEnum)("mdn_type", ["one_time", "long_term"]);
exports.MDNMessageModel = (0, pg_core_1.pgTable)("mdn_messages", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    requestId: (0, pg_core_1.varchar)("request_id").notNull(),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { mode: "date" }).notNull(),
    from: (0, pg_core_1.varchar)("from").notNull(),
    to: (0, pg_core_1.varchar)("to").notNull(),
    reply: (0, pg_core_1.varchar)("reply").notNull(),
    pin: (0, pg_core_1.varchar)("pin"),
    type: (0, exports.MDNTypeEnum)("type").notNull(),
    ...timestamps,
});
exports.ProxyTypeEnum = (0, pg_core_1.pgEnum)("proxy_type", ["shared", "exclusive"]);
exports.RentedProxyModel = (0, pg_core_1.pgTable)("rented_proxies", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    requestId: (0, pg_core_1.varchar)("request_id").notNull(),
    port: (0, pg_core_1.varchar)("port").notNull(),
    proxyCarrier: (0, pg_core_1.varchar)("proxy_carrier").notNull(),
    proxyUser: (0, pg_core_1.varchar)("proxy_user").notNull(),
    proxyPass: (0, pg_core_1.varchar)("proxy_pass").notNull(),
    proxyIp: (0, pg_core_1.varchar)("proxy_ip").notNull(),
    proxySocksPort: (0, pg_core_1.integer)("proxy_socks_port").notNull(),
    proxyHttpPort: (0, pg_core_1.integer)("proxy_http_port").notNull(),
    price: (0, pg_core_1.real)("price").notNull(),
    proxyType: (0, exports.ProxyTypeEnum)("proxy_type").notNull(),
    expirationDate: (0, pg_core_1.timestamp)("expiration_date", { mode: "date" }).notNull(),
    service: (0, pg_core_1.varchar)("service").notNull(),
    ...timestamps,
});
exports.DeviceTransactionModel = (0, pg_core_1.pgTable)("device_transactions", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    line: (0, pg_core_1.varchar)("line").notNull(),
    price: (0, pg_core_1.real)("price").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { mode: "date" }).notNull(),
    ...timestamps,
});
exports.PasswordResetRequestModel = (0, pg_core_1.pgTable)("password_reset_requests", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    email: (0, pg_core_1.varchar)("email").notNull(),
    selector: (0, pg_core_1.varchar)("selector").notNull(),
    token: (0, pg_core_1.varchar)("token").notNull(),
    ...timestamps,
});
exports.Socks5ProxyCartModel = (0, pg_core_1.pgTable)("socks5_proxy_cart", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    proxyId: (0, pg_core_1.varchar)("proxy_id").notNull(),
    price: (0, pg_core_1.real)("price").notNull(),
    originalPrice: (0, pg_core_1.real)("original_price").notNull(),
    ...timestamps,
}, (table) => ({
    userIdIdx: (0, pg_core_1.index)("socks5_cart_user_id_idx").on(table.userId),
}));
exports.Socks5AuthModel = (0, pg_core_1.pgTable)("socks5_auth", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id).unique(),
    username: (0, pg_core_1.varchar)("username").notNull(),
    password: (0, pg_core_1.varchar)("password").notNull(),
    ...timestamps,
});
exports.Socks5ProxyTransactionModel = (0, pg_core_1.pgTable)("socks5_proxy_transactions", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    port: (0, pg_core_1.varchar)("port").notNull(),
    note: (0, pg_core_1.varchar)("note"),
    originalPrice: (0, pg_core_1.real)("original_price").notNull(),
    price: (0, pg_core_1.real)("price").notNull(),
    country: (0, pg_core_1.varchar)("country").notNull(),
    ip: (0, pg_core_1.varchar)("ip").notNull(),
    state: (0, pg_core_1.varchar)("state").notNull(),
    city: (0, pg_core_1.varchar)("city").notNull(),
    zip: (0, pg_core_1.varchar)("zip").notNull(),
    type: (0, pg_core_1.varchar)("type").notNull(),
    auth: (0, pg_core_1.varchar)("auth").notNull(),
    ...timestamps,
});
exports.SMSPVAFavoriteCountryModel = (0, pg_core_1.pgTable)("sms_pva_favorite_countries", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    countryCode: (0, pg_core_1.varchar)("country_code", { length: 2 }).notNull(),
    ...timestamps,
}, (table) => ({
    userIdIdx: (0, pg_core_1.index)("sms_pva_fav_country_user_idx").on(table.userId),
}));
exports.SMSPVAFavoriteServiceModel = (0, pg_core_1.pgTable)("sms_pva_favorite_services", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    serviceId: (0, pg_core_1.varchar)("service_id").notNull(),
    ...timestamps,
}, (table) => ({
    userIdIdx: (0, pg_core_1.index)("sms_pva_fav_service_user_idx").on(table.userId),
    serviceIdIdx: (0, pg_core_1.index)("sms_pva_fav_service_id_idx").on(table.serviceId),
}));
exports.SMSPVAOneTimeRentModel = (0, pg_core_1.pgTable)("sms_pva_one_time_rents", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    requestId: (0, pg_core_1.text)("request_id").notNull(),
    mdn: (0, pg_core_1.varchar)("mdn").notNull(),
    service: (0, pg_core_1.varchar)("service").notNull(),
    status: (0, exports.RentStatusEnum)("status").notNull(),
    price: (0, pg_core_1.real)("price").notNull(),
    originalPrice: (0, pg_core_1.real)("original_price").notNull(),
    message: (0, pg_core_1.text)("message"),
    pin: (0, pg_core_1.text)("pin"),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { mode: "date" }).notNull(),
    ...timestamps,
});
exports.SMSPVALongTermRentModel = (0, pg_core_1.pgTable)("sms_pva_long_term_rents", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    requestId: (0, pg_core_1.text)("request_id").notNull(),
    mdn: (0, pg_core_1.varchar)("mdn").notNull(),
    service: (0, pg_core_1.varchar)("service").notNull(),
    status: (0, exports.RentStatusEnum)("status").notNull(),
    price: (0, pg_core_1.real)("price").notNull(),
    originalPrice: (0, pg_core_1.real)("original_price").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { mode: "date" }).notNull(),
    ...timestamps,
});
// ─── Notifications ────────────────────────────────────────────────────────────
exports.NotificationModel = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.serial)("id").primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.UserModel.id),
    type: (0, pg_core_1.varchar)("type").notNull(), // "proxy_rent" | "topup_approved" | "system"
    title: (0, pg_core_1.varchar)("title").notNull(),
    message: (0, pg_core_1.varchar)("message").notNull(),
    isRead: (0, pg_core_1.boolean)("is_read").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
    userIdIdx: (0, pg_core_1.index)("notifications_user_id_idx").on(table.userId),
    isReadIdx: (0, pg_core_1.index)("notifications_is_read_idx").on(table.isRead),
}));
