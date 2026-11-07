// Automated checks for every success and failure case.
// Run with: npm test   (uses Node's built-in test runner and an in-memory database)

const test = require("node:test");
const assert = require("node:assert");
const { initDb } = require("../src/db");
const createApp = require("../src/app");

let server;
let base;
let db;

test.before(async () => {
  db = await initDb(":memory:");
  const app = createApp(db);
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await db.close();
});

async function call(method, path, body, rawBody) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  if (rawBody !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = rawBody;
  }
  const res = await fetch(base + path, options);
  const json = await res.json();
  return { status: res.status, json };
}

// ---------- GET /books ----------

test("GET /books returns 200 with defaults (limit 10, offset 0, sorted by id ASC)", async () => {
  const { status, json } = await call("GET", "/books");
  assert.strictEqual(status, 200);
  assert.strictEqual(json.limit, 10);
  assert.strictEqual(json.offset, 0);
  assert.strictEqual(json.count, 10);
  assert.ok(json.total >= 12);
  const ids = json.data.map((b) => b.id);
  assert.deepStrictEqual(ids, [...ids].sort((a, b) => a - b));
});

test("search_q does a partial, case-insensitive title match", async () => {
  const { status, json } = await call("GET", "/books?search_q=clean");
  assert.strictEqual(status, 200);
  assert.ok(json.data.length >= 2);
  for (const b of json.data) assert.match(b.title.toLowerCase(), /clean/);
});

test("search_q with no match returns 200 and an empty list", async () => {
  const { status, json } = await call("GET", "/books?search_q=zzzzzz");
  assert.strictEqual(status, 200);
  assert.strictEqual(json.total, 0);
  assert.deepStrictEqual(json.data, []);
});

test("order_by=price&order=DESC sorts by price descending", async () => {
  const { status, json } = await call("GET", "/books?order_by=price&order=DESC&limit=100");
  assert.strictEqual(status, 200);
  const prices = json.data.map((b) => b.price);
  assert.deepStrictEqual(prices, [...prices].sort((a, b) => b - a));
});

test("limit and offset paginate the results", async () => {
  const page1 = await call("GET", "/books?limit=3&offset=0");
  const page2 = await call("GET", "/books?limit=3&offset=3");
  assert.strictEqual(page1.json.count, 3);
  assert.strictEqual(page2.json.count, 3);
  assert.notStrictEqual(page1.json.data[0].id, page2.json.data[0].id);
});

test("min_price and max_price filter with BETWEEN", async () => {
  const { status, json } = await call("GET", "/books?min_price=500&max_price=900&limit=100");
  assert.strictEqual(status, 200);
  assert.ok(json.data.length > 0);
  for (const b of json.data) assert.ok(b.price >= 500 && b.price <= 900);
});

test("only min_price works on its own", async () => {
  const { json } = await call("GET", "/books?min_price=1200&limit=100");
  assert.ok(json.data.length > 0);
  for (const b of json.data) assert.ok(b.price >= 1200);
});

test("only max_price works on its own", async () => {
  const { json } = await call("GET", "/books?max_price=500&limit=100");
  assert.ok(json.data.length > 0);
  for (const b of json.data) assert.ok(b.price <= 500);
});

test("filters can be combined", async () => {
  const { json } = await call(
    "GET",
    "/books?search_q=clean&max_price=700&order_by=title&order=ASC"
  );
  for (const b of json.data) {
    assert.match(b.title.toLowerCase(), /clean/);
    assert.ok(b.price <= 700);
  }
});

test("invalid order_by returns 400", async () => {
  const { status, json } = await call("GET", "/books?order_by=password");
  assert.strictEqual(status, 400);
  assert.ok(json.message.includes("order_by"));
});

test("invalid order returns 400", async () => {
  const { status } = await call("GET", "/books?order=sideways");
  assert.strictEqual(status, 400);
});

test("non-numeric limit returns 400", async () => {
  const { status } = await call("GET", "/books?limit=abc");
  assert.strictEqual(status, 400);
});

test("limit above the maximum returns 400", async () => {
  const { status } = await call("GET", "/books?limit=1000");
  assert.strictEqual(status, 400);
});

test("negative offset returns 400", async () => {
  const { status } = await call("GET", "/books?offset=-1");
  assert.strictEqual(status, 400);
});

test("non-numeric min_price returns 400", async () => {
  const { status } = await call("GET", "/books?min_price=cheap");
  assert.strictEqual(status, 400);
});

test("min_price greater than max_price returns 400", async () => {
  const { status } = await call("GET", "/books?min_price=900&max_price=100");
  assert.strictEqual(status, 400);
});

test("SQL injection in search_q is treated as plain text", async () => {
  const { status, json } = await call("GET", "/books?search_q=" + encodeURIComponent("' OR 1=1 --"));
  assert.strictEqual(status, 200);
  assert.strictEqual(json.total, 0);
});

test("SQL injection in order_by is rejected", async () => {
  const { status } = await call("GET", "/books?order_by=" + encodeURIComponent("id; DROP TABLE books"));
  assert.strictEqual(status, 400);
});

// ---------- GET /books/:id ----------

test("GET /books/1 returns 200 and the book", async () => {
  const { status, json } = await call("GET", "/books/1");
  assert.strictEqual(status, 200);
  assert.strictEqual(json.data.id, 1);
});

test("GET /books/9999 returns 404", async () => {
  const { status, json } = await call("GET", "/books/9999");
  assert.strictEqual(status, 404);
  assert.ok(json.message);
});

test("GET /books/abc returns 400", async () => {
  const { status } = await call("GET", "/books/abc");
  assert.strictEqual(status, 400);
});

// ---------- POST /books ----------

test("POST /books creates a book and returns 201", async () => {
  const { status, json } = await call("POST", "/books", {
    title: "Test Driven Development",
    author: "Kent Beck",
    price: 450,
  });
  assert.strictEqual(status, 201);
  assert.ok(json.data.id > 0);
  assert.strictEqual(json.data.title, "Test Driven Development");

  const fetched = await call("GET", `/books/${json.data.id}`);
  assert.strictEqual(fetched.status, 200);
});

test("POST accepts a numeric string price", async () => {
  const { status, json } = await call("POST", "/books", {
    title: "String Price",
    author: "Someone",
    price: "123.5",
  });
  assert.strictEqual(status, 201);
  assert.strictEqual(json.data.price, 123.5);
});

test("POST with missing title returns 400", async () => {
  const { status, json } = await call("POST", "/books", { author: "A", price: 10 });
  assert.strictEqual(status, 400);
  assert.ok(json.message.includes("title"));
});

test("POST with missing author returns 400", async () => {
  const { status, json } = await call("POST", "/books", { title: "T", price: 10 });
  assert.strictEqual(status, 400);
  assert.ok(json.message.includes("author"));
});

test("POST with blank title returns 400", async () => {
  const { status } = await call("POST", "/books", { title: "   ", author: "A", price: 10 });
  assert.strictEqual(status, 400);
});

test("POST with non-numeric price returns 400", async () => {
  const { status, json } = await call("POST", "/books", { title: "T", author: "A", price: "abc" });
  assert.strictEqual(status, 400);
  assert.ok(json.message.includes("price"));
});

test("POST with missing price returns 400", async () => {
  const { status } = await call("POST", "/books", { title: "T", author: "A" });
  assert.strictEqual(status, 400);
});

test("POST with negative price returns 400", async () => {
  const { status } = await call("POST", "/books", { title: "T", author: "A", price: -5 });
  assert.strictEqual(status, 400);
});

test("POST with an empty body returns 400 listing every problem", async () => {
  const { status, json } = await call("POST", "/books", {});
  assert.strictEqual(status, 400);
  assert.strictEqual(json.errors.length, 3);
});

test("POST with malformed JSON returns 400", async () => {
  const { status, json } = await call("POST", "/books", undefined, "{ not valid json");
  assert.strictEqual(status, 400);
  assert.strictEqual(json.message, "Invalid JSON in request body");
});

// ---------- PUT /books/:id ----------

test("PUT /books/:id updates and returns 200", async () => {
  const created = await call("POST", "/books", { title: "Old", author: "Writer", price: 100 });
  const id = created.json.data.id;

  const { status, json } = await call("PUT", `/books/${id}`, {
    title: "New",
    author: "Writer",
    price: 200,
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(json.data.title, "New");

  const fetched = await call("GET", `/books/${id}`);
  assert.strictEqual(fetched.json.data.price, 200);
});

test("PUT on a missing id returns 404", async () => {
  const { status } = await call("PUT", "/books/9999", { title: "X", author: "Y", price: 1 });
  assert.strictEqual(status, 404);
});

test("PUT with invalid body returns 400", async () => {
  const { status } = await call("PUT", "/books/1", { title: "", author: "Y", price: 1 });
  assert.strictEqual(status, 400);
});

test("PUT with a non-numeric id returns 400", async () => {
  const { status } = await call("PUT", "/books/abc", { title: "X", author: "Y", price: 1 });
  assert.strictEqual(status, 400);
});

// ---------- DELETE /books/:id ----------

test("DELETE /books/:id returns 200, then 404 on the next try", async () => {
  const created = await call("POST", "/books", { title: "Temp", author: "Temp", price: 1 });
  const id = created.json.data.id;

  const first = await call("DELETE", `/books/${id}`);
  assert.strictEqual(first.status, 200);

  const again = await call("DELETE", `/books/${id}`);
  assert.strictEqual(again.status, 404);

  const fetched = await call("GET", `/books/${id}`);
  assert.strictEqual(fetched.status, 404);
});

test("DELETE with a non-numeric id returns 400", async () => {
  const { status } = await call("DELETE", "/books/abc");
  assert.strictEqual(status, 400);
});

// ---------- Other ----------

test("unknown route returns 404 in { message } format", async () => {
  const { status, json } = await call("GET", "/authors");
  assert.strictEqual(status, 404);
  assert.ok(json.message);
});

test("GET / and /health return 200", async () => {
  assert.strictEqual((await call("GET", "/")).status, 200);
  assert.strictEqual((await call("GET", "/health")).status, 200);
});
