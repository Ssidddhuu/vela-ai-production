import { createApp } from "./app";
import { config } from "./lib/env";

createApp().listen(config.port, () => {
  console.log(`Vela server running on http://localhost:${config.port}`);
});
