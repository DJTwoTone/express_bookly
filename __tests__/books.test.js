process.env.NODE_ENV = "test"

const request = require("supertest");

const app = require("../app")
const db = require("../db")

let book_isbn;

beforeEach(async () => {
    let result = await db.query(`
    INSERT INTO 
      books (isbn, amazon_url,author,language,pages,publisher,title,year)   
      VALUES(
        '123432122', 
        'https://amazon.com/taco', 
        'Elie', 
        'English', 
        100,  
        'Nothing publishers', 
        'my first book', 2008) 
      RETURNING isbn`
    );

    book_isbn = result.rows[0].isbn
});

describe("test POST route /books", async function () {
    test("creates a new book", async function () {
        const responce = await request(app)
        .post('/books')
        .send({
            isbn: '32794782',
            amazon_url: "https://taco.com",
            author: "mctest",
            language: "english",
            pages: 1000,
            publisher: "yeah right",
            title: "amazing times",
            year: 2000
        })
        expect(responce.statusCode).toBe(201);
        expect(responce.body.book).toHaveProperty("isbn");
    })

    test("Prevents book creation without title", async function () {
        const responce = await request(app)
        .post('/books')
        .send({
            year: 2020
        });
        expect(responce.statusCode).toBe(400);
    });
})

describe("test GET route /books", async function () {
    test("Gets a list of books (we should only have 1)", async function () {
        const responce = await request(app).get('/books');
        const books = responce.body.books;
        expect(books).toHaveLength(1);
        expect(books[0]).toHaveProperty("isbn")
        expect(books[0]).toHaveProperty("amazon_url")
    });
});

describe("test GET route /books/:isbn", async function () {
    test("gets a single book", async function () {
        const responce = await request(app)
            .get(`/books/${book_isbn}`)
        expect(responce.body.book).toHaveProperty("isbn")
        expect(responce.body.book.isbn).toBe(book_isbn);
    });

    test("responds 404 if book is not found", async function () {
        const responce = await request(app).get('/books/666')
        expect(responce.statusCode).toBe(404)
    })
})

describe("test PUT route /books/:isbn", async function () {
    test("updates a book", async function () {
        const responce = await request(app)
        .put(`/books/${book_isbn}`)
        .send({
             isbn: `${book_isbn}`,
            amazon_url: "https://taco.com",
            author: "mctest",
            language: "english",
            pages: 1000,
            publisher: "yeah right",
            title: "UPDATED BOOK",
            year: 2000
        });
        expect(responce.body.book).toHaveProperty("isbn")
        expect(responce.body.book.title).toBe("UPDATED BOOK");
        expect(responce.body.book.title).not.toBe("amazing times");
    });

    test("Prevents erronious book updates", async function () {
        const responce = await request(app)
        .put(`/books/${book_isbn}`).send({
            isbn: "32794782",
            badField: "DO NOT ADD ME!",
            amazon_url: "https://taco.com",
            author: "mctest",
            language: "english",
            pages: 1000,
            publisher: "yeah right",
            title: "UPDATED BOOK",
            year: 2000  
        });
        expect(responce.statusCode).toBe(400);
    });
});

describe("test DELETE route /books/:isbn", async function () {
    test("Deletes a book", async function () {
        const responce = await request(app)
        .delete(`/books/${book_isbn}`)
        expect(responce.body).toEqual({message: "Book deleted"});
        const res2 = await request(app).get(`/books/${book_isbn}`);
        expect(res2.statusCode).toBe(404);
    });
});

afterEach(async function () {
    await db.query("DELETE from books");
});

afterAll(async function () {
    await db.end()
})