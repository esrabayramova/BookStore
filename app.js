var express = require('express');
var path = require('path');
var mysql = require("mysql");
var bodyParser = require('body-parser');
var ejs = require('ejs');
var session = require('express-session');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const publicDir = path.join(__dirname, '/public');

var app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(publicDir));

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, 'tmp')
}));

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

var conn = mysql.createConnection({
	host : "localhost",
	user : "root",
	password : "",
	database : "book_store"
});

app.get('/', (req, res) => {
    req.session.loggedIn = false;
    res.render('firstpage');
})

//---------------------Admin---------------------------
app.get('/admin', (req, res) => {
    req.session.loggedIn = false;
    res.render('admin_login');
})

app.post('/admin', (req, res) => {
    var flag = false;
    conn.query('SELECT * FROM admin', function(err, result){
        if (err) throw err;
        result.forEach(function(el){
            if (el.admin_name === req.body.ad_name && el.admin_pass === req.body.ad_pass){
                flag = true;
            }
        })
        req.session.loggedIn = flag;
        if (req.session.loggedIn){
            res.redirect('/adminmain');
        }
        else res.send(`Wrong! <a href='/admin'>Go back. </a>`)
    })
})

app.get('/adminmain', (req, res) => {
    if (req.session.loggedIn){
        conn.query('SELECT * FROM books', function(err, result){
            if (err) throw err;
            res.render('admin_main', {books:result})
        })
    }
    else res.send(`Can't access.  <a href="/admin">Login as an admin </a>`);
})

app.get('/addbook', (req, res) => {
    if (req.session.loggedIn)
        res.render('add_book');
    else res.send(`Can't access.  <a href="/admin">Login as an admin </a>`);
})

app.post('/addbook', (req, res) => {
    let targetFile = req.files.image_file;
    let file_name = targetFile.name;
    let extName = path.extname(targetFile.name);
    let baseName = path.basename(targetFile.name, extName);
    let uploadDir = path.join(__dirname, '/public/images/', targetFile.name);
    console.log(uploadDir);

    //restriction on file extensions
    let imgList = ['.png', '.jpg', '.jpeg', '.gif'];
    if (!imgList.includes(extName)){
        fs.unlinkSync(targetFile.tempFilePath);
        return res.send("Wrong image format. ");
    }

    targetFile.mv(uploadDir, (err) => {
        if (err) throw err;
    })

    conn.query("INSERT INTO books (title, author, genre, subject, price, book_pic) VALUES ('"+req.body.title+"', '"+req.body.author+"', '"+req.body.genre+"', '"+req.body.subject+"', '"+req.body.price+"', '"+file_name+"')", function(err, result){
        if (err) throw err;
        conn.query("SELECT * FROM books", function(err, result){
            res.render('admin_main', {books:result})
        })
    })
})

app.get('/deletebook/:name', (req, res) => {
    if (req.session.loggedIn){
        conn.query("DELETE FROM books WHERE title = '"+req.params.name+"'", function(err, result){
            if (err) throw err;
            console.log('Record deleted');
            res.redirect('/adminmain');
        })
    }else res.send(`Can't access.  <a href="/admin">Login as an admin </a>`);
})

app.get('/updatebook/:name', (req, res) => {
    if (req.session.loggedIn){
        conn.query("SELECT * FROM books WHERE title = '"+req.params.name+"'", function(err, result){
            res.render('update_book', {book:result[0]})
        })
    }
    else res.send(`Can't access.  <a href="/admin">Login as an admin </a>`)
})

app.post('/updatebook/:name', (req, res) => {
    conn.query("UPDATE books SET price = '"+req.body.price+"' WHERE title = '"+req.params.name+"'", function(err, result){
        if (err) throw err;
        res.redirect('/adminmain')
    })
})

//------------------User----------------------------
app.get('/books', (req, res) => {
    req.session.loggedIn = false;
    conn.query('SELECT * FROM books', function(err, result){
        if (err) throw err;
        res.render('mainpage', {books:result})
    })
})

app.get('/:name', (req, res) => {
    flag = false;
    conn.query("SELECT * FROM books WHERE title = '"+req.params.name+"'", function(err, result){
        if (err) throw err;
        //console.log(result);
        //console.log(result[0]);
        res.render('book', {book:result[0]});
    })
})

app.get('/:name/reviews', (req, res) => {
    flag = false;
    var num = 0;
    conn.query("SELECT * FROM book_reviews WHERE book_title = '"+req.params.name+"'", function(err, result){
        if (err) throw err;
        result.forEach(function (){
            num += 1
        })
        res.render('see_reviews', {reviews:result, title:req.params.name, numb:num})
    })
})

app.get('/:name/review', (req, res) => {
    flag = false;
    res.render('add_review', {title:req.params.name});
})

app.post('/:name/review', (req, res) => {
    var username = req.body.name;
    var review = req.body.review;
    conn.query("INSERT INTO book_reviews (book_title, username, review, date_time) VALUES ('"+req.params.name+"', '"+username+"', '"+review+"', NOW()) ", function(err, result){
        if (err) throw err;
        res.redirect(`/${req.params.name}/reviews`);
    })
})

app.listen(3000, () => {console.log('running. ')})
