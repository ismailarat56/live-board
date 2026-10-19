import { createClient } from "redis";

export async function connectRedis(url: string) {
  const publisher = createClient({ url, disableOfflineQueue: true });
  const subscriber = publisher.duplicate();

  publisher.on("error", (error: Error) => {
    console.error("Redis yayın bağlantısı:", error.message);
  });
  subscriber.on("error", (error: Error) => {
    console.error("Redis abone bağlantısı:", error.message);
  });

  await Promise.all([publisher.connect(), subscriber.connect()]);

  return {
    publisher,
    subscriber,
    async close() {
      await Promise.all([publisher.close(), subscriber.close()]);
    },
  };
}
