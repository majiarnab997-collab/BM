# Postman test list

Import `postman/Lab3-Books-API.postman_collection.json` into Postman. Set the collection variable `baseUrl` to `http://localhost:3000` (or your live URL), then run the collection in order. Each request has test scripts that check the status code and the response body. Request 8 saves the new book's id into `createdId`, which requests 9, 10 and 22 use.

## Success cases

| # | Request | Expected status | What to check |
|---|---------|-----------------|---------------|
| 1 | `GET /books` | 200 | `limit` is 10, `offset` is 0, `data` is an array |
| 2 | `GET /books?search_q=clean` | 200 | every title contains "clean" |
| 3 | `GET /books?order_by=price&order=DESC&limit=100` | 200 | prices are in descending order |
| 4 | `GET /books?limit=3&offset=3` | 200 | 3 books returned, offset is 3 |
| 5 | `GET /books?min_price=500&max_price=900&limit=100` | 200 | every price is between 500 and 900 |
| 6 | `GET /books?search_q=clean&max_price=800&order_by=title&order=ASC&limit=5&offset=0` | 200 | all filters work together |
| 7 | `GET /books/1` | 200 | returns book with id 1 |
| 8 | `POST /books` with `{"title":"Postman Test Book","author":"Lab Student","price":350}` | 201 | id returned |
| 9 | `PUT /books/{{createdId}}` with new title and price | 200 | title updated |
| 10 | `DELETE /books/{{createdId}}` | 200 | message returned |

## Failure cases

| # | Request | Expected status | What to check |
|---|---------|-----------------|---------------|
| 11 | `POST /books` without `title` | 400 | message mentions title |
| 12 | `POST /books` without `author` | 400 | message mentions author |
| 13 | `POST /books` with `"price": "abc"` | 400 | message mentions price |
| 14 | `POST /books` with broken JSON | 400 | message is "Invalid JSON in request body" |
| 15 | `GET /books?order_by=password` | 400 | message mentions order_by |
| 16 | `GET /books?limit=abc` | 400 | message mentions limit |
| 17 | `GET /books?min_price=900&max_price=100` | 400 | min greater than max rejected |
| 18 | `GET /books/abc` | 400 | invalid id rejected |
| 19 | `GET /books/9999` | 404 | message returned |
| 20 | `PUT /books/9999` | 404 | missing record |
| 21 | `DELETE /books/9999` | 404 | missing record |
| 22 | `GET /books/{{createdId}}` after the delete | 404 | the book is really gone |

## Extra checks worth doing by hand

- `GET /books?search_q=' OR 1=1 --` returns 200 with no rows (the text is treated as data, not SQL).
- `GET /books?order_by=id; DROP TABLE books` returns 400 (column names are checked against a whitelist).
- `GET /authors` returns 404 in the same `{ "message": "..." }` format.
