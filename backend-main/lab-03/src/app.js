const express = require("express");
const booksRouter = require("./routes/books");

/** Creates the Express app. Kept separate from server.js so tests can import it. */
function createApp(db) {
  const app = express();

  app.use(express.json());

  // Health check / welcome route (also used by hosting platforms)
  app.get("/", (req, res) => {
    res.status(200).json({
      message: "Books REST API is running",
      endpoints: [
        "GET /books",
        "GET /books/:id",
        "POST /books",
        "PUT /books/:id",
        "DELETE /books/:id",
      ],
    });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ message: "OK" });
  });

  app.use("/books", booksRouter(db));

  // Unknown route -> 404 in the same { message } format
  app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
  });

  // Central error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // Malformed JSON in the request body
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Invalid JSON in request body" });
    }
    if (err.type === "entity.too.large") {
      return res.status(413).json({ message: "Request body too large" });
    }

    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}

module.exports = createApp;
