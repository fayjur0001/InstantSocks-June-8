"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.logout = logout;
exports.me = me;
exports.getUserBalance = getUserBalance;
exports.getNotificationCount = getNotificationCount;
exports.loginAs = loginAs;
exports.exitLoginAs = exitLoginAs;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
exports.changePin = changePin;
const schema_1 = require("@/db/schema");
const schema_2 = require("@/db/schema");
const mailer_1 = require("@/utils/mailer");
const auth_middleware_1 = require("@/middleware/auth.middleware");
const db_1 = __importDefault(require("@/db"));
const schema_3 = require("@/db/schema");
const unlogging_error_1 = __importDefault(require("@/utils/unlogging-error"));
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const get_balance_1 = __importDefault(require("@/utils/get-balance"));
function getBadge(role) {
    switch (role) {
        case "super admin":
            return "Super Admin";
        case "admin":
            return "Admin";
        case "support":
            return "Support";
        default:
            return "Basic User";
    }
}
// ── REGISTER ─────────────────────────────────────────────────────
async function register(req, res) {
    try {
        const { username, email, password, pin } = zod_1.z.object({
            username: zod_1.z.string().trim().min(1, "Username is required"),
            email: zod_1.z.string().trim().email("Invalid email address"),
            password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
            pin: zod_1.z.string().regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits"),
        }).parse(req.body);
        const existingUser = await db_1.default.query.UserModel.findFirst({
            where: (m) => (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(m.username, username), (0, drizzle_orm_1.eq)(m.email, email))
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Username already exists",
            });
        }
        const [hashedPassword, hashedPin] = await Promise.all([
            bcryptjs_1.default.hash(password, 10),
            bcryptjs_1.default.hash(pin, 10),
        ]);
        // ✅ FIX: Race condition বন্ধ — COUNT query + INSERT একটা transaction এ।
        // দুইটা concurrent request একসাথে "0 users" দেখে দুইজন super admin হতে পারবে না।
        await db_1.default.transaction(async (tx) => {
            const [{ count }] = await tx
                .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_3.UserModel);
            const role = count === 0 ? "super admin" : "general";
            await tx.insert(schema_3.UserModel).values({
                username,
                email,
                password: hashedPassword,
                pinCode: hashedPin,
                role,
            });
        });
        return res.json({
            success: true,
            message: "Registration successful",
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                message: error.errors[0]?.message || "Invalid registration data",
            });
        }
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
// ── LOGIN ─────────────────────────────────────────────────────────
async function login(req, res) {
    try {
        const { username, identifier, password, pin, rememberMe, } = req.body;
        const loginIdentifier = username || identifier;
        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required",
            });
        }
        const user = await db_1.default.query.UserModel.findFirst({
            where: (m) => (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(m.username, loginIdentifier), (0, drizzle_orm_1.ilike)(m.email, loginIdentifier)),
        });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid username or password",
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid username or password",
            });
        }
        if (user.pinCode) {
            if (!pin) {
                return res.status(400).json({
                    success: false,
                    message: "PIN is required",
                });
            }
            const isPinValid = await bcryptjs_1.default.compare(pin, user.pinCode);
            if (!isPinValid) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid username or password",
                });
            }
        }
        if (user.banned) {
            return res.status(403).json({
                success: false,
                message: "Your account has been banned.",
                reason: "banned",
            });
        }
        // ✅ FIX: suspended user ও login করতে পারবে না
        if (user.bannedTill && user.bannedTill > new Date()) {
            return res.status(403).json({
                success: false,
                message: `Your account is suspended until ${user.bannedTill.toUTCString()}.`,
                reason: "suspended",
                bannedTill: user.bannedTill,
            });
        }
        const deviceToken = crypto_1.default.randomBytes(32).toString("hex");
        await db_1.default.insert(schema_3.UserDeviceModel).values({
            userId: user.id,
            token: deviceToken,
        });
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role,
            deviceToken: deviceToken,
        };
        (0, auth_middleware_1.setAuthCookie)(res, payload, rememberMe ? 30 : 0);
        return res.json({
            success: true,
            role: user.role,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
// ── LOGOUT ───────────────────────────────────────────────────────
async function logout(req, res) {
    try {
        if (req.token)
            await db_1.default
                .delete(schema_3.UserDeviceModel)
                .where((0, drizzle_orm_1.eq)(schema_3.UserDeviceModel.token, req.token));
        (0, auth_middleware_1.clearAuthCookie)(res);
        res.json({ success: true });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}
// ── ME ────────────────────────────────────────────────────────────
async function me(req, res) {
    try {
        const p = req.payload;
        const [user, additionalInfo] = await Promise.all([
            db_1.default.query.UserModel.findFirst({
                where: (m, { eq }) => eq(m.id, p.id),
                // ✅ FIX: banned ও bannedTill এখন return হচ্ছে
                columns: { email: true, banned: true, bannedTill: true },
            }),
            db_1.default.query.AdditionalUserInformationModel.findFirst({
                where: (m, { eq }) => eq(m.userId, p.id),
            }),
        ]);
        return res.json({
            success: true,
            user: {
                id: p.id,
                username: p.username,
                badge: getBadge(p.role),
                role: p.role,
                isShadowAdmin: p.isShadowAdmin ?? false,
                email: user?.email || "",
                // ✅ FIX: frontend জানতে পারবে banned/suspended কিনা
                banned: user?.banned ?? false,
                bannedTill: user?.bannedTill ?? null,
                firstName: additionalInfo?.firstName || "",
                nickName: additionalInfo?.nickName || "",
                lastName: additionalInfo?.lastName || "",
                website: additionalInfo?.website || "",
                telegram: additionalInfo?.telegram || "",
                jabber: additionalInfo?.jabber || "",
                bio: additionalInfo?.bio || "",
                avatar: additionalInfo?.profilePicture || "",
            },
        });
    }
    catch {
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ── BALANCE ──────────────────────────────────────────────────────
async function getUserBalance(req, res) {
    try {
        const balance = await (0, get_balance_1.default)(req.payload.id);
        res.json({ success: true, balance });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}
// ── NOTIFICATIONS COUNT ──────────────────────────────────────────
async function getNotificationCount(req, res) {
    try {
        const { id: userId, role } = req.payload;
        // FIX: opened ticket count সরানো হয়েছে — unread messages query তে
        // already open tickets ই count হয়, তাই দুটো যোগ করলে double-count হত।
        // এখন শুধু: unseen ticket messages + unread notifications।
        const [unread, unreadNotif] = await Promise.all([
            db_1.default
                .select({ total: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_3.TicketModel)
                .leftJoin(schema_3.TicketMessageModel, (0, drizzle_orm_1.eq)(schema_3.TicketMessageModel.ticketId, schema_3.TicketModel.id))
                .leftJoin(schema_3.TicketMessageSeenByModel, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_3.TicketMessageSeenByModel.messageId, schema_3.TicketMessageModel.id), (0, drizzle_orm_1.eq)(schema_3.TicketMessageSeenByModel.userId, userId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_3.TicketModel.agentId, userId), (0, drizzle_orm_1.eq)(schema_3.TicketModel.userId, userId), ["admin", "super admin", "support"].includes(role)
                ? (0, drizzle_orm_1.isNull)(schema_3.TicketModel.agentId)
                : undefined), (0, drizzle_orm_1.isNull)(schema_3.TicketMessageSeenByModel.id), (0, drizzle_orm_1.eq)(schema_3.TicketModel.status, "opened")))
                .then((r) => r.at(0)?.total || 0),
            // unread notification count
            db_1.default
                .select({ total: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_3.NotificationModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_3.NotificationModel.userId, userId), (0, drizzle_orm_1.eq)(schema_3.NotificationModel.isRead, false)))
                .then((r) => r.at(0)?.total || 0),
        ]);
        res.json({ success: true, count: unread + unreadNotif });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}
// ── LOGIN AS ─────────────────────────────────────────────────────
async function loginAs(req, res) {
    try {
        // ✅ FIX: client "user_id" পাঠায়, server "id" expect করত — দুটোই accept করা হচ্ছে
        const id = zod_1.z.coerce.number().int().min(1).parse(req.body.id ?? req.body.user_id);
        const user = await db_1.default
            .select({
            id: schema_3.UserModel.id,
            role: schema_3.UserModel.role,
            username: schema_3.UserModel.username,
            banned: schema_3.UserModel.banned,
            bannedTill: schema_3.UserModel.bannedTill,
        })
            .from(schema_3.UserModel)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_3.UserModel.id, id), (0, drizzle_orm_1.notInArray)(schema_3.UserModel.role, ["admin", "super admin"])))
            .limit(1)
            .then((r) => r.at(0));
        if (!user)
            throw new unlogging_error_1.default("User not found.");
        // Save the superadmin's current token so we can restore the session later
        const originalAdminToken = req.token;
        (0, auth_middleware_1.setAuthCookie)(res, {
            isShadowAdmin: true,
            originalAdminToken,
            role: user.role,
            id: user.id,
            username: user.username,
        });
        res.json({ success: true });
    }
    catch (e) {
        if (e instanceof unlogging_error_1.default) {
            res.status(400).json({ success: false, message: e.message });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}
// ── EXIT LOGIN AS ─────────────────────────────────────────────────
async function exitLoginAs(req, res) {
    try {
        const payload = req.payload;
        if (!payload.isShadowAdmin || !payload.originalAdminToken) {
            return res.status(400).json({
                success: false,
                message: "Not in an impersonation session.",
            });
        }
        const adminPayload = (0, auth_middleware_1.getPayloadFromToken)(payload.originalAdminToken);
        if (!adminPayload) {
            // Original admin token is expired — clear everything and force re-login
            (0, auth_middleware_1.clearAuthCookie)(res);
            return res.status(401).json({
                success: false,
                message: "Admin session expired. Please log in again.",
            });
        }
        // Restore the original superadmin cookie
        (0, auth_middleware_1.setAuthCookie)(res, adminPayload);
        res.json({ success: true, role: adminPayload.role });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}
// ── FORGOT PASSWORD ──────────────────────────────────────────────
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }
        const user = await db_1.default.query.UserModel.findFirst({
            where: (m, { eq }) => eq(m.email, email),
            columns: { id: true, email: true },
        });
        if (user) {
            const selector = crypto_1.default.randomBytes(20).toString("hex");
            const rawToken = crypto_1.default.randomBytes(40).toString("hex");
            const hashedToken = await bcryptjs_1.default.hash(rawToken, 10);
            await db_1.default
                .delete(schema_2.PasswordResetRequestModel)
                .where((0, drizzle_orm_1.eq)(schema_2.PasswordResetRequestModel.email, email));
            await db_1.default.insert(schema_2.PasswordResetRequestModel).values({
                email,
                selector,
                token: hashedToken,
            });
            const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
            const resetLink = `${clientUrl}/reset-password?selector=${selector}&token=${rawToken}`;
            try {
                await (0, mailer_1.sendPasswordResetEmail)(email, resetLink);
            }
            catch (err) {
                console.error("Email send failed:", err);
            }
        }
        return res.json({
            success: true,
            message: "If an account exists, a reset link has been sent.",
        });
    }
    catch (error) {
        console.error("forgotPassword error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
// ── RESET PASSWORD ───────────────────────────────────────────────
async function resetPassword(req, res) {
    try {
        const { selector, token, newPassword } = req.body;
        if (!selector || !token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "selector, token and newPassword are required",
            });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters",
            });
        }
        const resetRequest = await db_1.default.query.PasswordResetRequestModel.findFirst({
            where: (m, { eq, and, gt }) => and(eq(m.selector, selector), gt(m.createdAt, new Date(Date.now() - 60 * 60 * 1000))),
        });
        if (!resetRequest) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset link",
            });
        }
        const tokenValid = await bcryptjs_1.default.compare(token, resetRequest.token);
        if (!tokenValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset link",
            });
        }
        const user = await db_1.default.query.UserModel.findFirst({
            where: (m, { eq }) => eq(m.email, resetRequest.email),
            columns: { id: true, email: true },
        });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found",
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        const updated = await db_1.default
            .update(schema_3.UserModel)
            .set({ password: hashedPassword })
            .where((0, drizzle_orm_1.eq)(schema_3.UserModel.email, resetRequest.email))
            .returning({ id: schema_3.UserModel.id });
        if (!updated || updated.length === 0) {
            return res.status(500).json({
                success: false,
                message: "Password update failed",
            });
        }
        await db_1.default
            .delete(schema_2.PasswordResetRequestModel)
            .where((0, drizzle_orm_1.eq)(schema_2.PasswordResetRequestModel.selector, selector));
        await db_1.default
            .delete(schema_3.UserDeviceModel)
            .where((0, drizzle_orm_1.eq)(schema_3.UserDeviceModel.userId, user.id));
        return res.json({
            success: true,
            message: "Password has been reset successfully",
        });
    }
    catch (error) {
        console.error("resetPassword error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
// ── GET PROFILE ──────────────────────────────────────────────────
async function getProfile(req, res) {
    try {
        const userId = req.payload.id;
        const [user, additionalInfo] = await Promise.all([
            db_1.default.query.UserModel.findFirst({
                where: (m, { eq }) => eq(m.id, userId),
                columns: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    isOnline: true,
                    banned: true,
                    createdAt: true,
                },
            }),
            db_1.default.query.AdditionalUserInformationModel.findFirst({
                where: (m, { eq }) => eq(m.userId, userId),
            }),
        ]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }
        return res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                isOnline: user.isOnline,
                createdAt: user.createdAt,
                firstName: additionalInfo?.firstName || "",
                nickName: additionalInfo?.nickName || "",
                lastName: additionalInfo?.lastName || "",
                website: additionalInfo?.website || "",
                telegram: additionalInfo?.telegram || "",
                jabber: additionalInfo?.jabber || "",
                bio: additionalInfo?.bio || "",
                avatar: additionalInfo?.profilePicture || "",
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}
// ── UPDATE PROFILE ───────────────────────────────────────────────
async function updateProfile(req, res) {
    try {
        const userId = req.payload.id;
        const schema = zod_1.z.object({
            username: zod_1.z
                .string()
                .min(3, "Username min 3 chars")
                .max(30, "Username max 30 chars")
                .regex(/^[a-zA-Z0-9_]+$/, "Username: only letters, numbers, underscore")
                .optional(),
            firstName: zod_1.z.string().max(50).optional(),
            lastName: zod_1.z.string().max(50).optional(),
            nickName: zod_1.z.string().max(50).optional(),
            website: zod_1.z.string().max(200).optional(),
            telegram: zod_1.z.string().max(100).optional(),
            jabber: zod_1.z.string().max(100).optional(),
            bio: zod_1.z.string().max(500).optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: parsed.error.errors[0]?.message || "Invalid input",
            });
        }
        const { username, firstName, lastName, nickName, website, telegram, jabber, bio } = parsed.data;
        // Username change — unique check
        if (username) {
            const existing = await db_1.default.query.UserModel.findFirst({
                where: (m, { eq, and, ne }) => and(eq(m.username, username), ne(m.id, userId)),
                columns: { id: true },
            });
            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: "Username already taken.",
                });
            }
            await db_1.default
                .update(schema_3.UserModel)
                .set({ username })
                .where((0, drizzle_orm_1.eq)(schema_3.UserModel.id, userId));
        }
        // AdditionalUserInformation — upsert
        const additionalData = {
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(nickName !== undefined && { nickName }),
            ...(website !== undefined && { website }),
            ...(telegram !== undefined && { telegram }),
            ...(jabber !== undefined && { jabber }),
            ...(bio !== undefined && { bio }),
        };
        if (Object.keys(additionalData).length > 0) {
            const existingInfo = await db_1.default.query.AdditionalUserInformationModel.findFirst({
                where: (m, { eq }) => eq(m.userId, userId),
                columns: { id: true },
            });
            if (existingInfo) {
                await db_1.default
                    .update(schema_1.AdditionalUserInformationModel)
                    .set(additionalData)
                    .where((0, drizzle_orm_1.eq)(schema_1.AdditionalUserInformationModel.userId, userId));
            }
            else {
                await db_1.default.insert(schema_1.AdditionalUserInformationModel).values({
                    userId,
                    ...additionalData,
                });
            }
        }
        return res.json({
            success: true,
            message: "Profile updated successfully.",
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}
// ── CHANGE PASSWORD ──────────────────────────────────────────────
async function changePassword(req, res) {
    try {
        const userId = req.payload.id;
        const { oldPassword, newPassword } = zod_1.z.object({
            oldPassword: zod_1.z.string().min(1, "Old password required"),
            newPassword: zod_1.z.string().min(8, "New password min 8 chars"),
        }).parse(req.body);
        const user = await db_1.default.query.UserModel.findFirst({
            where: (m, { eq }) => eq(m.id, userId),
            columns: { password: true },
        });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        const isMatch = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Old password is incorrect." });
        }
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        await db_1.default.update(schema_3.UserModel).set({ password: hashed }).where((0, drizzle_orm_1.eq)(schema_3.UserModel.id, userId));
        return res.json({ success: true, message: "Password changed successfully." });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: error.errors[0]?.message });
        }
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ── CHANGE PIN ───────────────────────────────────────────────────
async function changePin(req, res) {
    try {
        const userId = req.payload.id;
        const { oldPin, newPin } = zod_1.z.object({
            oldPin: zod_1.z.string().optional(),
            newPin: zod_1.z.string().length(6, "PIN must be exactly 6 digits").regex(/^\d+$/, "PIN must be numeric"),
        }).parse(req.body);
        const user = await db_1.default.query.UserModel.findFirst({
            where: (m, { eq }) => eq(m.id, userId),
            columns: { pinCode: true },
        });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        // PIN already set → old pin verify
        if (user.pinCode) {
            if (!oldPin) {
                return res.status(400).json({ success: false, message: "Old PIN required." });
            }
            const isMatch = await bcryptjs_1.default.compare(oldPin, user.pinCode);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: "Old PIN is incorrect." });
            }
        }
        const hashedPin = await bcryptjs_1.default.hash(newPin, 10);
        await db_1.default.update(schema_3.UserModel).set({ pinCode: hashedPin }).where((0, drizzle_orm_1.eq)(schema_3.UserModel.id, userId));
        return res.json({ success: true, message: "PIN changed successfully." });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: error.errors[0]?.message });
        }
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
}
