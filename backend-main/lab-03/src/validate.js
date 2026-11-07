// Validation helpers. Every function returns either a clean value or an error string.

const SORTABLE_COLUMNS = ["id", "title", "author", "price"];
const MAX_LIMIT = 100;

/** Converts a number or numeric string to a finite number, otherwise returns null. */
function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Validates the body of POST /books and PUT /books/:id. */
function validateBookBody(body) {
  const errors = [];
  const data = {};

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["Request body must be a JSON object"], data };
  }

  if (typeof body.title !== "string" || body.title.trim() === "") {
    errors.push("title is required and must be a non-empty string");
  } else {
    data.title = body.title.trim();
  }

  if (typeof body.author !== "string" || body.author.trim() === "") {
    errors.push("author is required and must be a non-empty string");
  } else {
    data.author = body.author.trim();
  }

  const price = toNumber(body.price);
  if (price === null) {
    errors.push("price is required and must be a number");
  } else if (price < 0) {
    errors.push("price must not be negative");
  } else {
    data.price = price;
  }

  return { errors, data };
}

/** Parses :id from the URL. Must be a positive whole number. */
function parseId(raw) {
  if (!/^\d+$/.test(String(raw))) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}

/** Validates and applies defaults for GET /books query parameters. */
function parseListQuery(query) {
  const errors = [];

  const search_q = typeof query.search_q === "string" ? query.search_q.trim() : "";

  const order_by = query.order_by === undefined ? "id" : String(query.order_by).toLowerCase();
  if (!SORTABLE_COLUMNS.includes(order_by)) {
    errors.push(`order_by must be one of: ${SORTABLE_COLUMNS.join(", ")}`);
  }

  const order = query.order === undefined ? "ASC" : String(query.order).toUpperCase();
  if (order !== "ASC" && order !== "DESC") {
    errors.push("order must be ASC or DESC");
  }

  let limit = 10;
  if (query.limit !== undefined) {
    const n = toNumber(query.limit);
    if (n === null || !Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
      errors.push(`limit must be a whole number between 1 and ${MAX_LIMIT}`);
    } else {
      limit = n;
    }
  }

  let offset = 0;
  if (query.offset !== undefined) {
    const n = toNumber(query.offset);
    if (n === null || !Number.isInteger(n) || n < 0) {
      errors.push("offset must be a whole number of 0 or more");
    } else {
      offset = n;
    }
  }

  let min_price = null;
  if (query.min_price !== undefined) {
    min_price = toNumber(query.min_price);
    if (min_price === null) errors.push("min_price must be a number");
  }

  let max_price = null;
  if (query.max_price !== undefined) {
    max_price = toNumber(query.max_price);
    if (max_price === null) errors.push("max_price must be a number");
  }

  if (min_price !== null && max_price !== null && min_price > max_price) {
    errors.push("min_price must not be greater than max_price");
  }

  return {
    errors,
    params: { search_q, order_by, order, limit, offset, min_price, max_price },
  };
}

module.exports = { validateBookBody, parseId, parseListQuery, SORTABLE_COLUMNS, MAX_LIMIT };
