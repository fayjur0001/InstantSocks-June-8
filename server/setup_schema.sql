-- =============================================
-- InstantSocks - Full Schema Setup
-- Run: psql -U postgres -d new_instantsocks -f setup_schema.sql
-- =============================================

-- ENUMS
CREATE TYPE "role" AS ENUM ('general', 'admin', 'super admin', 'support');
CREATE TYPE "status" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "payment_method" AS ENUM ('blockonomics', 'now_payments', 'shkeeper');
CREATE TYPE "ticket_status" AS ENUM ('opened', 'closed');
CREATE TYPE "rent_status" AS ENUM ('Reserved', 'Awaiting MDN', 'Active', 'Expired', 'Rejected', 'Completed', 'Timed Out');
CREATE TYPE "online_status" AS ENUM ('awaiting mdn', 'online', 'offline');
CREATE TYPE "rent_type" AS ENUM ('short', 'regular', 'unlimited');
CREATE TYPE "mdn_type" AS ENUM ('one_time', 'long_term');
CREATE TYPE "proxy_type" AS ENUM ('shared', 'exclusive');

-- USERS
CREATE TABLE "users" (
  "id" serial PRIMARY KEY,
  "username" varchar NOT NULL UNIQUE,
  "email" varchar NOT NULL UNIQUE,
  "jabber" varchar,
  "telegram" varchar,
  "pin_code" text,
  "is_online" boolean NOT NULL DEFAULT false,
  "role" "role" NOT NULL DEFAULT 'general',
  "password" text NOT NULL,
  "banned" boolean NOT NULL DEFAULT false,
  "banned_till" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "users_username_idx" ON "users"("username");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_jabber_idx" ON "users"("jabber");
CREATE INDEX "users_telegram_idx" ON "users"("telegram");

-- ADDITIONAL USER INFORMATION
CREATE TABLE "additional_user_information" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id"),
  "first_name" varchar,
  "nick_name" varchar,
  "last_name" varchar,
  "website" varchar,
  "telegram" varchar,
  "jabber" varchar,
  "profile_image" varchar,
  "bio" varchar,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- USER DEVICES
CREATE TABLE "user_devices" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "token" varchar NOT NULL UNIQUE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "user_devices_token_idx" ON "user_devices"("token");
CREATE INDEX "user_devices_user_id_idx" ON "user_devices"("user_id");

-- SITE OPTIONS
CREATE TABLE "site_options" (
  "id" serial PRIMARY KEY,
  "name" varchar NOT NULL UNIQUE,
  "value" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ADDED FUNDS
CREATE TABLE "added_funds" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "txid" varchar,
  "amount" real NOT NULL,
  "status" "status" NOT NULL DEFAULT 'pending',
  "wallet_address" varchar NOT NULL,
  "currency" varchar NOT NULL DEFAULT 'BTC',
  "method" "payment_method" NOT NULL DEFAULT 'blockonomics',
  "manualy_uploaded" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- TICKETS
CREATE TABLE "tickets" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "agent_id" integer REFERENCES "users"("id"),
  "subject" varchar NOT NULL,
  "status" "ticket_status" NOT NULL DEFAULT 'opened',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- TICKET MESSAGES
CREATE TABLE "ticket_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "ticket_id" integer NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "message" varchar NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- TICKET MESSAGE SEEN BYS
CREATE TABLE "ticket_message_seen_bys" (
  "id" serial PRIMARY KEY NOT NULL,
  "message_id" integer NOT NULL REFERENCES "ticket_messages"("id"),
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ONE TIME RENTS
CREATE TABLE "one_time_rents" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "request_id" text NOT NULL,
  "mdn" varchar NOT NULL,
  "service" varchar NOT NULL,
  "status" "rent_status" NOT NULL,
  "state" varchar NOT NULL,
  "price" real NOT NULL,
  "original_price" real NOT NULL,
  "carrier" varchar NOT NULL,
  "message" text,
  "pin" text,
  "till_expiration" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- LONG TERM RENTS
CREATE TABLE "long_term_rents" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "request_id" text NOT NULL,
  "mdn" varchar NOT NULL,
  "service" varchar NOT NULL,
  "status" "rent_status" NOT NULL,
  "price" real NOT NULL,
  "message" text,
  "pin" text,
  "expiration_date" timestamp NOT NULL,
  "online_status" "online_status" NOT NULL,
  "rent_type" "rent_type" NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- MDN MESSAGES
CREATE TABLE "mdn_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "request_id" varchar NOT NULL,
  "timestamp" timestamp NOT NULL,
  "from" varchar NOT NULL,
  "to" varchar NOT NULL,
  "reply" varchar NOT NULL,
  "pin" varchar,
  "type" "mdn_type" NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- RENTED PROXIES
CREATE TABLE "rented_proxies" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "request_id" varchar NOT NULL,
  "port" varchar NOT NULL,
  "proxy_carrier" varchar NOT NULL,
  "proxy_user" varchar NOT NULL,
  "proxy_pass" varchar NOT NULL,
  "proxy_ip" varchar NOT NULL,
  "proxy_socks_port" integer NOT NULL,
  "proxy_http_port" integer NOT NULL,
  "price" real NOT NULL,
  "proxy_type" "proxy_type" NOT NULL,
  "expiration_date" timestamp NOT NULL,
  "service" varchar NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- DEVICE TRANSACTIONS
CREATE TABLE "device_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "line" varchar NOT NULL,
  "price" real NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- PASSWORD RESET REQUESTS
CREATE TABLE "password_reset_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar NOT NULL,
  "selector" varchar NOT NULL,
  "token" varchar NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- SOCKS5 PROXY CART
CREATE TABLE "socks5_proxy_cart" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "proxy_id" varchar NOT NULL,
  "price" real NOT NULL,
  "original_price" real NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "socks5_cart_user_id_idx" ON "socks5_proxy_cart"("user_id");

-- SOCKS5 AUTH
CREATE TABLE "socks5_auth" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id"),
  "username" varchar NOT NULL,
  "password" varchar NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- SOCKS5 PROXY TRANSACTIONS
CREATE TABLE "socks5_proxy_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "port" varchar NOT NULL,
  "note" varchar,
  "original_price" real NOT NULL,
  "price" real NOT NULL,
  "country" varchar NOT NULL,
  "ip" varchar NOT NULL,
  "state" varchar NOT NULL,
  "city" varchar NOT NULL,
  "zip" varchar NOT NULL,
  "type" varchar NOT NULL,
  "auth" varchar NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- SMS PVA FAVORITE COUNTRIES
CREATE TABLE "sms_pva_favorite_countries" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "country_code" varchar(2) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "sms_pva_fav_country_user_idx" ON "sms_pva_favorite_countries"("user_id");

-- SMS PVA FAVORITE SERVICES
CREATE TABLE "sms_pva_favorite_services" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "service_id" varchar NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "sms_pva_fav_service_user_idx" ON "sms_pva_favorite_services"("user_id");
CREATE INDEX "sms_pva_fav_service_id_idx" ON "sms_pva_favorite_services"("service_id");

-- SMS PVA ONE TIME RENTS
CREATE TABLE "sms_pva_one_time_rents" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "request_id" text NOT NULL,
  "mdn" varchar NOT NULL,
  "service" varchar NOT NULL,
  "status" "rent_status" NOT NULL,
  "price" real NOT NULL,
  "original_price" real NOT NULL,
  "message" text,
  "pin" text,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- SMS PVA LONG TERM RENTS
CREATE TABLE "sms_pva_long_term_rents" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "request_id" text NOT NULL,
  "mdn" varchar NOT NULL,
  "service" varchar NOT NULL,
  "status" "rent_status" NOT NULL,
  "price" real NOT NULL,
  "original_price" real NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Done!
SELECT 'Schema created successfully!' AS result;