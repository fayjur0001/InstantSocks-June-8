"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getBalance;
const db_1 = __importDefault(require("@/db"));
const schema_1 = require("@/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function getBalance(userId, tx) {
    const d = tx || db_1.default;
    const sum = async (table, where) => d.select({ total: (0, drizzle_orm_1.sql) `coalesce(sum(${table.price}), 0)::real` }).from(table).where(where).then((r) => r.at(0)?.total || 0);
    const deposits = await d.select({ total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.AddedFundModel.amount}), 0)::real` })
        .from(schema_1.AddedFundModel).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.userId, userId), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "approved")))
        .then((r) => r.at(0)?.total || 0);
    const [otr, ltr, devices, proxy, socks5, smsPvaOtr, smsPvaLtr] = await Promise.all([
        sum(schema_1.OneTimeRentModel, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.OneTimeRentModel.userId, userId), (0, drizzle_orm_1.inArray)(schema_1.OneTimeRentModel.status, ["Awaiting MDN", "Completed", "Reserved"]))),
        sum(schema_1.LongTermRentsModel, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.LongTermRentsModel.userId, userId), (0, drizzle_orm_1.inArray)(schema_1.LongTermRentsModel.status, ["Reserved", "Active", "Awaiting MDN", "Expired", "Completed"]))),
        sum(schema_1.DeviceTransactionModel, (0, drizzle_orm_1.eq)(schema_1.DeviceTransactionModel.userId, userId)),
        sum(schema_1.RentedProxyModel, (0, drizzle_orm_1.eq)(schema_1.RentedProxyModel.userId, userId)),
        sum(schema_1.Socks5ProxyTransactionModel, (0, drizzle_orm_1.eq)(schema_1.Socks5ProxyTransactionModel.userId, userId)),
        sum(schema_1.SMSPVAOneTimeRentModel, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.SMSPVAOneTimeRentModel.userId, userId), (0, drizzle_orm_1.inArray)(schema_1.SMSPVAOneTimeRentModel.status, ["Awaiting MDN", "Completed", "Reserved"]))),
        sum(schema_1.SMSPVALongTermRentModel, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.SMSPVALongTermRentModel.userId, userId), (0, drizzle_orm_1.inArray)(schema_1.SMSPVALongTermRentModel.status, ["Reserved", "Active", "Awaiting MDN", "Expired", "Completed"]))),
    ]);
    return deposits - otr - ltr - devices - proxy - socks5 - smsPvaOtr - smsPvaLtr;
}
