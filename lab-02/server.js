
const express = require("express");
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "database.db");

let db;

// Initialize the database before starting the server
async function initializeDBAndServer() {
    try {
        db = await sqlite.open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        await db.exec(`
            CREATE TABLE IF NOT EXISTS book (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                price INTEGER NOT NULL,
                pages INTEGER NOT NULL
            );
        `);

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
            console.log("Database connected successfully");
        });
    } catch (error) {
        console.error("Database initialization failed:", error.message);
        process.exit(1);
    }
}

initializeDBAndServer();

// GET /books/ - Get all books
app.get("/books/", async (request, response) => {
    try {
        const books = await db.all("SELECT * FROM book ORDER BY id");
        response.status(200).json(books);
    } catch (error) {
        response.status(500).json({ error: "Unable to retrieve books" });
    }
});

// GET /books/:bookId/ - Get one book
app.get("/books/:bookId/", async (request, response) => {
    try {
        const { bookId } = request.params;

        if (!/^[1-9]\d*$/.test(bookId)) {
            return response.status(400).json({ error: "Invalid book ID" });
        }

        const book = await db.get(
            "SELECT * FROM book WHERE id = ?",
            [Number(bookId)]
        );

        if (!book) {
            return response.status(404).json({ error: "Book not found" });
        }

        response.status(200).json(book);
    } catch (error) {
        response.status(500).json({ error: "Unable to retrieve book" });
    }
});

// POST /books/ - Add a book
app.post("/books/", async (request, response) => {
    try {
        const { title, author, price, pages } = request.body;

        if (
            typeof title !== "string" || !title.trim() ||
            typeof author !== "string" || !author.trim() ||
            !Number.isInteger(price) || price < 0 ||
            !Number.isInteger(pages) || pages <= 0
        ) {
            return response.status(400).json({
                error: "Provide a title, author, non-negative integer price, and positive integer pages"
            });
        }

        const result = await db.run(
            `INSERT INTO book (title, author, price, pages)
             VALUES (?, ?, ?, ?)`,
            [title.trim(), author.trim(), price, pages]
        );

        response.status(201).json({
            id: result.lastID,
            message: "Book added successfully"
        });
    } catch (error) {
        response.status(500).json({ error: "Unable to add book" });
    }
});

// PUT /books/:bookId/ - Update a book
app.put("/books/:bookId/", async (request, response) => {
    try {
        const { bookId } = request.params;
        const { title, author, price, pages } = request.body;

        if (!/^[1-9]\d*$/.test(bookId)) {
            return response.status(400).json({ error: "Invalid book ID" });
        }

        if (
            typeof title !== "string" || !title.trim() ||
            typeof author !== "string" || !author.trim() ||
            !Number.isInteger(price) || price < 0 ||
            !Number.isInteger(pages) || pages <= 0
        ) {
            return response.status(400).json({
                error: "Provide a title, author, non-negative integer price, and positive integer pages"
            });
        }

        const result = await db.run(
            `UPDATE book
             SET title = ?, author = ?, price = ?, pages = ?
             WHERE id = ?`,
            [title.trim(), author.trim(), price, pages, Number(bookId)]
        );

        if (result.changes === 0) {
            return response.status(404).json({ error: "Book not found" });
        }

        response.status(200).json({ message: "Book updated successfully" });
    } catch (error) {
        response.status(500).json({ error: "Unable to update book" });
    }
});

// DELETE /books/:bookId/ - Delete a book
app.delete("/books/:bookId/", async (request, response) => {
    try {
        const { bookId } = request.params;

        if (!/^[1-9]\d*$/.test(bookId)) {
            return response.status(400).json({ error: "Invalid book ID" });
        }

        const result = await db.run(
            "DELETE FROM book WHERE id = ?",
            [Number(bookId)]
        );

        if (result.changes === 0) {
            return response.status(404).json({ error: "Book not found" });
        }

        response.status(200).json({ message: "Book deleted successfully" });
    } catch (error) {
        response.status(500).json({ error: "Unable to delete book" });
    }
});

module.exports = { initializeDBAndServer };
