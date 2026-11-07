require("dotenv").config({ quiet: true });

const http = require("http");
const { initDb } = require("./db");
const createApp = require("./app");

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  const db = await initDb();
  const app = createApp(db);

  // Using http.createServer so the 'listening' and 'error' events are separate
  const server = http.createServer(app);

  // Friendly message for the classic EADDRINUSE (port already in use) error
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other process or set a different PORT in .env.`
      );
    } else {
      console.error("Server error:", err);
    }
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Close the database cleanly on shutdown
  const shutdown = () => {
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
