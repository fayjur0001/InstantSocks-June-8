import db from "@/db";
import { AddedFundModel, DeviceTransactionModel, LongTermRentsModel, OneTimeRentModel, RentedProxyModel, Socks5ProxyTransactionModel, SMSPVAOneTimeRentModel, SMSPVALongTermRentModel } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export default async function getBalance(userId: number, tx?: any): Promise<number> {
  const d = tx || db;
  const sum = async (table: any, where: any) =>
    d.select({ total: sql`coalesce(sum(${table.price}), 0)::real` }).from(table).where(where).then((r: any) => r.at(0)?.total || 0);

  const deposits = await d.select({ total: sql`coalesce(sum(${AddedFundModel.amount}), 0)::real` })
    .from(AddedFundModel).where(and(eq(AddedFundModel.userId, userId), eq(AddedFundModel.status, "approved")))
    .then((r: any) => r.at(0)?.total || 0);

  const [otr, ltr, devices, proxy, socks5, smsPvaOtr, smsPvaLtr] = await Promise.all([
    sum(OneTimeRentModel, and(eq(OneTimeRentModel.userId, userId), inArray(OneTimeRentModel.status, ["Awaiting MDN","Completed","Reserved"]))),
    sum(LongTermRentsModel, and(eq(LongTermRentsModel.userId, userId), inArray(LongTermRentsModel.status, ["Reserved","Active","Awaiting MDN","Expired","Completed"]))),
    sum(DeviceTransactionModel, eq(DeviceTransactionModel.userId, userId)),
    sum(RentedProxyModel, eq(RentedProxyModel.userId, userId)),
    sum(Socks5ProxyTransactionModel, eq(Socks5ProxyTransactionModel.userId, userId)),
    sum(SMSPVAOneTimeRentModel, and(eq(SMSPVAOneTimeRentModel.userId, userId), inArray(SMSPVAOneTimeRentModel.status, ["Awaiting MDN","Completed","Reserved"]))),
    sum(SMSPVALongTermRentModel, and(eq(SMSPVALongTermRentModel.userId, userId), inArray(SMSPVALongTermRentModel.status, ["Reserved","Active","Awaiting MDN","Expired","Completed"]))),
  ]);

  return deposits - otr - ltr - devices - proxy - socks5 - smsPvaOtr - smsPvaLtr;
}