"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pusher;
const pusher_1 = __importDefault(require("pusher"));
const pusherClient = new pusher_1.default({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true,
});
async function pusher({ page, to, payload }) {
    try {
        const channel = to || "broadcast";
        const eventData = { page };
        if (payload) {
            eventData.action = payload.action;
            if (payload.action === "update") {
                eventData.id = payload.id;
            }
            else if (payload.action === "notification") {
                eventData.title = payload.title;
                eventData.message = payload.message;
            }
        }
        await pusherClient.trigger(channel, "revalidate", eventData);
    }
    catch (e) {
        // Pusher error হলে log করো কিন্তু main flow block করো না
        console.warn("Pusher warning (non-critical):", e?.message);
    }
}
