const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const SEED_BOOKS = [
  ["The Pragmatic Programmer", "Andrew Hunt", 899.0],
  ["Clean Code", "Robert C. Martin", 749.5],
  ["Eloquent JavaScript", "Marijn Haverbeke", 599.0],
  ["You Don't Know JS", "Kyle Simpson", 499.0],
  ["Node.js Design Patterns", "Mario Casciaro", 1099.0],
  ["JavaScript: The Good Parts", "Douglas Crockford", 399.0],
  ["Designing Data-Intensive Applications", "Martin Kleppmann", 1499.0],
  ["Refactoring", "Martin Fowler", 1199.0],
  ["The Clean Coder", "Robert C. Martin", 649.0],
  ["Learning SQL", "Alan Beaulieu", 549.0],
  ["Head First Design Patterns", "Eric Freeman", 899.0],
  ["Database System Concepts", "Abraham Silberschatz", 1299.0],
];

/**
 * Opens the SQLite database, creates the books table if needed
 * and inserts sample rows when the table is empty.
 */
async function initDb(dbPath = process.env.DB_PATH || "./books.db") {
  const resolved = dbPath === ":memory:" ? dbPath : path.resolve(dbPath);

  const db = await open({
    filename: resolved,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price REAL NOT NULL
    );
  `);

  const { count } = await db.get("SELECT COUNT(*) AS count FROM books");
  if (count === 0) {
    for (const [title, author, price] of SEED_BOOKS) {
      await db.run(
        "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
        [title, author, price]
      );
    }
  }

  return db;
}

module.exports = { initDb };
