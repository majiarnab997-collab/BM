# Debugging exercise notes

The faculty hands out a broken version of the project. These are the four errors to expect, how to recognise each one, and how to fix it. When you do the exercise, write your own notes on what you saw in the README "Notes" section.

## 1. Port conflict: `EADDRINUSE`

**Symptom**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Cause:** another process (often an old copy of this server) is already using port 3000.

**Fix:** stop the old process, or run on another port.

```bash
# find and stop what is using port 3000 (macOS / Linux)
lsof -i :3000
kill <PID>

# Windows (PowerShell)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# or simply use a different port
PORT=3001 npm start
```

This project also catches the error in `src/server.js` and prints a clear message instead of a long stack trace.

## 2. Wrong import path: `Cannot find module`

**Symptom**

```
Error: Cannot find module './route/books'
```

**Cause:** the path in `require()` does not match the real folder or file name (`routes` vs `route`), or a `../` is missing.

**Fix:** check spelling, letter case and the number of `../`. Paths are relative to the file that contains the `require`. For example, from `src/app.js` the router is `./routes/books`, and from `src/routes/books.js` the validators are `../validate`.

## 3. Table-name typo: `no such table`

**Symptom**

```
SQLITE_ERROR: no such table: book
```

**Cause:** the query uses a different name from the one in `CREATE TABLE` (`book` vs `books`).

**Fix:** use the exact table name everywhere. Open the database (for example with the `sqlite3` command line or the DB Browser for SQLite app) and run `.tables` to see the real name. If the table was never created, check that the `CREATE TABLE IF NOT EXISTS books` step in `src/db.js` runs before the first query.

## 4. Missing `await`

**Symptom:** the route responds with `{}` or `[object Promise]`, or the database change seems not to happen, and no error is shown.

```js
// wrong: books is a Promise, not the rows
const books = db.all("SELECT * FROM books");

// right
const books = await db.all("SELECT * FROM books");
```

**Cause:** database calls are asynchronous and return a Promise. Without `await` the code moves on before the result is ready. The route function must also be declared `async`.

**Fix:** add `await` before every `db.get`, `db.all`, `db.run` and `db.exec`, and make sure the enclosing function is `async`.

## General debugging tips

1. Read the first line of the error. It usually names the file, line and cause.
2. Reproduce the problem with one small request in Postman.
3. Add a temporary `console.log` near the failing line, and remove it afterwards.
4. Check the status code first, then the response body.
