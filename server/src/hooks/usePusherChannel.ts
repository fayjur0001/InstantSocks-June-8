"use client";

import { useEffect } from "react";
import PusherClient from "pusher-js";

let pusherInstance: PusherClient | null = null;

function getPusher(): PusherClient {
  if (!pusherInstance) {
    pusherInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
      }
    );
  }
  return pusherInstance;
}

export function usePusherChannel(
  channel: string,
  event: string,
  handler: (data: Record<string, unknown>) => void
) {
  useEffect(() => {
    const pusher = getPusher();
    const ch = pusher.subscribe(channel);
    ch.bind(event, handler);

    return () => {
      ch.unbind(event, handler);
      pusher.unsubscribe(channel);
    };
  }, [channel, event, handler]);
}