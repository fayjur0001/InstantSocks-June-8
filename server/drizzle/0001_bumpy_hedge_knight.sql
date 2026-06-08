CREATE TYPE "public"."mdn_type" AS ENUM('one_time', 'long_term');--> statement-breakpoint
CREATE TYPE "public"."online_status" AS ENUM('awaiting mdn', 'online', 'offline');--> statement-breakpoint
CREATE TYPE "public"."rent_status" AS ENUM('Reserved', 'Awaiting MDN', 'Active', 'Expired', 'Rejected', 'Completed', 'Timed Out');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('general', 'support', 'admin', 'super admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."rent_type" AS ENUM('short', 'regular', 'unlimited');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('blockonomics', 'now_payments', 'yaan_pay');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "additional_user_information" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"first_name" varchar,
	"nick_name" varchar,
	"last_name" varchar,
	"website" varchar,
	"telegram" varchar,
	"jabber" varchar,
	"profile_image" varchar,
	"bio" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "additional_user_information_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "device_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"line" varchar NOT NULL,
	"price" real NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "long_term_rents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mdn_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" varchar NOT NULL,
	"timestamp" timestamp NOT NULL,
	"from" varchar NOT NULL,
	"to" varchar NOT NULL,
	"reply" varchar NOT NULL,
	"pin" varchar,
	"type" "mdn_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "one_time_rents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"selector" varchar NOT NULL,
	"token" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rented_proxies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_pva_favorite_countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_pva_favorite_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"service_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_pva_long_term_rents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"request_id" text NOT NULL,
	"mdn" varchar NOT NULL,
	"service" varchar NOT NULL,
	"status" "rent_status" NOT NULL,
	"price" real NOT NULL,
	"original_price" real NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_pva_one_time_rents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"request_id" text NOT NULL,
	"mdn" varchar NOT NULL,
	"service" varchar NOT NULL,
	"status" "rent_status" NOT NULL,
	"price" real NOT NULL,
	"original_price" real NOT NULL,
	"message" text,
	"pin" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "socks5_auth" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"username" varchar NOT NULL,
	"password" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "socks5_auth_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "socks5_proxy_cart" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"proxy_id" varchar NOT NULL,
	"price" real NOT NULL,
	"original_price" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "socks5_proxy_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"message" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_message_seen_bys" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"agent_id" integer,
	"subject" varchar NOT NULL,
	"status" "ticket_status" DEFAULT 'opened' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_devices_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "device_tokens" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "password_resets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "proxy_ips" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "proxy_transactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "support_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "support_tickets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "topups" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "device_tokens" CASCADE;--> statement-breakpoint
DROP TABLE "password_resets" CASCADE;--> statement-breakpoint
DROP TABLE "proxy_ips" CASCADE;--> statement-breakpoint
DROP TABLE "proxy_transactions" CASCADE;--> statement-breakpoint
DROP TABLE "support_messages" CASCADE;--> statement-breakpoint
DROP TABLE "support_tickets" CASCADE;--> statement-breakpoint
DROP TABLE "topups" CASCADE;--> statement-breakpoint
ALTER TABLE "site_options" DROP CONSTRAINT "site_options_key_unique";--> statement-breakpoint
ALTER TABLE "added_funds" DROP CONSTRAINT "added_funds_admin_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "added_funds" DROP CONSTRAINT "added_funds_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "added_funds" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "added_funds" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "added_funds" ALTER COLUMN "amount" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "title" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "message" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "site_options" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "telegram" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "jabber" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE role;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'general';--> statement-breakpoint
ALTER TABLE "added_funds" ADD COLUMN "txid" varchar;--> statement-breakpoint
ALTER TABLE "added_funds" ADD COLUMN "status" "status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "added_funds" ADD COLUMN "wallet_address" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "added_funds" ADD COLUMN "currency" varchar DEFAULT 'BTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "added_funds" ADD COLUMN "method" "payment_method" DEFAULT 'blockonomics' NOT NULL;--> statement-breakpoint
ALTER TABLE "added_funds" ADD COLUMN "manualy_uploaded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "added_funds" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "type" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "site_options" ADD COLUMN "name" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "site_options" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_online" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_till" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "agent_serial" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "additional_user_information" ADD CONSTRAINT "additional_user_information_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device_transactions" ADD CONSTRAINT "device_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "long_term_rents" ADD CONSTRAINT "long_term_rents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "one_time_rents" ADD CONSTRAINT "one_time_rents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rented_proxies" ADD CONSTRAINT "rented_proxies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sms_pva_favorite_countries" ADD CONSTRAINT "sms_pva_favorite_countries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sms_pva_favorite_services" ADD CONSTRAINT "sms_pva_favorite_services_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sms_pva_long_term_rents" ADD CONSTRAINT "sms_pva_long_term_rents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sms_pva_one_time_rents" ADD CONSTRAINT "sms_pva_one_time_rents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "socks5_auth" ADD CONSTRAINT "socks5_auth_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "socks5_proxy_cart" ADD CONSTRAINT "socks5_proxy_cart_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "socks5_proxy_transactions" ADD CONSTRAINT "socks5_proxy_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_message_seen_bys" ADD CONSTRAINT "ticket_message_seen_bys_message_id_ticket_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ticket_messages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_message_seen_bys" ADD CONSTRAINT "ticket_message_seen_bys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sms_pva_fav_country_user_idx" ON "sms_pva_favorite_countries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sms_pva_fav_service_user_idx" ON "sms_pva_favorite_services" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sms_pva_fav_service_id_idx" ON "sms_pva_favorite_services" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "socks5_cart_user_id_idx" ON "socks5_proxy_cart" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_devices_token_idx" ON "user_devices" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_devices_user_id_idx" ON "user_devices" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "added_funds" ADD CONSTRAINT "added_funds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_jabber_idx" ON "users" USING btree ("jabber");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_telegram_idx" ON "users" USING btree ("telegram");--> statement-breakpoint
ALTER TABLE "added_funds" DROP COLUMN IF EXISTS "admin_id";--> statement-breakpoint
ALTER TABLE "added_funds" DROP COLUMN IF EXISTS "note";--> statement-breakpoint
ALTER TABLE "site_options" DROP COLUMN IF EXISTS "key";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "pin";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "first_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "nick_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "website";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "bio";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "status";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "balance";--> statement-breakpoint
ALTER TABLE "site_options" ADD CONSTRAINT "site_options_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_agent_serial_unique" UNIQUE("agent_serial");--> statement-breakpoint
ALTER TABLE "public"."rented_proxies" ALTER COLUMN "proxy_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."proxy_type";--> statement-breakpoint
CREATE TYPE "public"."proxy_type" AS ENUM('shared', 'exclusive');--> statement-breakpoint
ALTER TABLE "public"."rented_proxies" ALTER COLUMN "proxy_type" SET DATA TYPE "public"."proxy_type" USING "proxy_type"::"public"."proxy_type";--> statement-breakpoint
ALTER TABLE "public"."tickets" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."ticket_status";--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('opened', 'closed');--> statement-breakpoint
ALTER TABLE "public"."tickets" ALTER COLUMN "status" SET DATA TYPE "public"."ticket_status" USING "status"::"public"."ticket_status";--> statement-breakpoint
DROP TYPE "public"."proxy_state";--> statement-breakpoint
DROP TYPE "public"."ticket_category";--> statement-breakpoint
DROP TYPE "public"."topup_provider";--> statement-breakpoint
DROP TYPE "public"."topup_status";--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
DROP TYPE "public"."user_status";