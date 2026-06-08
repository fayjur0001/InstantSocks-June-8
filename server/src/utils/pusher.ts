import Pusher from "pusher";

const pusherClient = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export default async function pusher({ page, to, payload }: {
  page: string;
  to?: string;
  payload?: { action: "new" } | { action: "update"; id: number } | { action: "notification"; title: string; message: string };
}) {
  try {
    const channel = to || "broadcast";
    const eventData: Record<string, unknown> = { page };

    if (payload) {
      eventData.action = payload.action;
      if (payload.action === "update") {
        eventData.id = (payload as any).id;
      } else if (payload.action === "notification") {
        eventData.title = (payload as any).title;
        eventData.message = (payload as any).message;
      }
    }

    await pusherClient.trigger(channel, "revalidate", eventData);
  } catch (e) {
    // Pusher error হলে log করো কিন্তু main flow block করো না
    console.warn("Pusher warning (non-critical):", (e as any)?.message);
  }
}