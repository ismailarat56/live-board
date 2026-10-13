import { app } from "./app.ts";
import { config } from "./config.ts";

app.listen(config.port, (error) => {
  if (error) {
    throw error;
  }

  console.log(`Live Board API http://localhost:${config.port} adresinde çalışıyor.`);
});
