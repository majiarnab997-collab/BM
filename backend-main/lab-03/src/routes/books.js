const express = require("express");
const { validateBookBody, parseId, parseListQuery } = require("../validate");

/**
 * Builds the /books router. The database handle is passed in so tests
 * can use a separate in-memory database.
 */
function booksRouter(db) {
  const router = express.Router();

  // GET /books  -> list with search, sort, price filter and pagination
  router.get("/", async (req, res) => {
    const { errors, params } = parseListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; "), errors });
    }

    const { search_q, order_by, order, limit, offset, min_price, max_price } = params;

    // Build the WHERE clause. Only the values are user input, and they are
    // always passed as ? parameters, never joined into the SQL string.
    const conditions = [];
    const values = [];

    if (search_q) {
      conditions.push("title LIKE ?");
      values.push(`%${search_q}%`);
    }
    if (min_price !== null && max_price !== null) {
      conditions.push("price BETWEEN ? AND ?");
      values.push(min_price, max_price);
    } else if (min_price !== null) {
      conditions.push("price >= ?");
      values.push(min_price);
    } else if (max_price !== null) {
      conditions.push("price <= ?");
      values.push(max_price);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Column names and sort direction cannot be bound as parameters, so they
    // are checked against a whitelist in parseListQuery before being used here.
    const listSql = `SELECT id, title, author, price FROM books ${where} ORDER BY ${order_by} ${order}, id ASC LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) AS total FROM books ${where}`;

    const books = await db.all(listSql, [...values, limit, offset]);
    const { total } = await db.get(countSql, values);

    res.status(200).json({
      message: "Books fetched successfully",
      total,
      count: books.length,
      limit,
      offset,
      data: books,
    });
  });

  // GET /books/:id  -> single book
  router.get("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "id must be a positive whole number" });
    }

    const book = await db.get("SELECT id, title, author, price FROM books WHERE id = ?", [id]);
    if (!book) {
      return res.status(404).json({ message: `Book with id ${id} not found` });
    }

    res.status(200).json({ message: "Book fetched successfully", data: book });
  });

  // POST /books  -> create
  router.post("/", async (req, res) => {
    const { errors, data } = validateBookBody(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; "), errors });
    }

    const result = await db.run(
      "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
      [data.title, data.author, data.price]
    );

    res.status(201).json({
      message: "Book created successfully",
      data: { id: result.lastID, ...data },
    });
  });

  // PUT /books/:id  -> full update
  router.put("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "id must be a positive whole number" });
    }

    const { errors, data } = validateBookBody(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; "), errors });
    }

    const result = await db.run(
      "UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?",
      [data.title, data.author, data.price, id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ message: `Book with id ${id} not found` });
    }

    res.status(200).json({
      message: "Book updated successfully",
      data: { id, ...data },
    });
  });

  // DELETE /books/:id  -> remove
  router.delete("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "id must be a positive whole number" });
    }

    const result = await db.run("DELETE FROM books WHERE id = ?", [id]);
    if (result.changes === 0) {
      return res.status(404).json({ message: `Book with id ${id} not found` });
    }

    res.status(200).json({ message: "Book deleted successfully" });
  });

  return router;
}

module.exports = booksRouter;
