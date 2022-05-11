const express = require('express');
const fs = require('fs');
const app = express();
const cookieParser = require('cookie-parser');
const port = 8080
const uuid = require('uuid').v4

var users = JSON.parse(fs.readFileSync("./users.json"));
var posts = JSON.parse(fs.readFileSync("./posts.json"));
var comments = JSON.parse(fs.readFileSync("./comments.json"));
app.use(cookieParser("a secret"))
app.use(express.urlencoded({ extended: true }))
    // console.log("users ", users)
    // app.use(express.urlencoded({ extended: true }))
app.use((req, res, next) => {
    console.log(req.method, req.url)

    console.log("cookies", req.cookies)
    console.log("signedCookies", req.signedCookies)
    next()
})

app.get("/", (req, res, next) => {

    console.log(posts)
    if (req.signedCookies.loginName || req.cookies.loginName) {
        res.write(`
      <div><a href="/">homepage</a></div>
      <div>welcome back, ${req.signedCookies.loginName?req.signedCookies.loginName:req.cookies.loginName}</div>
      <div><a href="/post-a-thread">post</a></div>
      <div><a href="/logout">Logout</a></div>
    `)
    } else {
        res.write(`
      <div><a href="/">homepage</a></div>
      <div><a href="/register">Register</a></div>
      <div><a href="/post-a-thread">post</a></div>
      <div><a href="/login">Login</a></div>
    `)
    }
    for (var post of posts) {
        res.write(`<div><a href="/post/${post.id}">${post.title}</a></div>`)
    }


})
app.get("/register", (req, res, next) => {
    console.log("register")
    res.type("html")
    res.end(
        `
        <form action="/register" method="POST">
        <div>user name<input type="text" name="name"></div>
        <div>email<input type="text" name="email"></div>
        <div>password<input type="text" name="password"></div> 
        <div>passwordConfirm<input type="text" name="passwordConfirm"></div> 
        <button type="submit">submit</button>
        </form>
        `
    )

})

app.post("/register", (req, res, next) => {
    var regInfo = req.body
    console.log(regInfo)
    if (regInfo.password != regInfo.passwordConfirm) {
        res.end("not same passwords!")
    }
    // if (users.some(it => it.name === regInfo.name)) {
    //     res.end("already exists")
    // }
    // if (users.some(it => it.email == regInfo.email)) {
    //     res.end('email already exists')
    // }
    var user = {
        name: regInfo.name,
        email: regInfo.email,
        password: regInfo.password,
    }
    console.log("users", users)

    res.type("html")
    res.end('register success, go <a href="/login">login</a>')
    users.push(user)
    fs.writeFileSync("./users.json", JSON.stringify(users, null, 2))
})
app.get("/login", function(req, res, next) {
    res.end(`
    <h1>Login</h1>
    <form action="/login" method="post">
      <div>Name: <input type="text" name="name"></div>
      <div>Password: <input type="password" name="password"></div>
      <button>Submit</button>
    </form>
  `)
})
app.post("/login", function(req, res, next) {
    var loginInfo = req.body
    var target = users.find(it => it.name == loginInfo.name && it.password == loginInfo.password)
    console.log(target)
    if (target) {
        res.cookie('loginName', target.name, {
            maxAge: 1000000000,
            signed: true,
        })
        res.redirect('/')
    }

})

app.get('/logout', (req, res, next) => {
    res.clearCookie('loginName')
    res.redirect('/')
})
app.get("/post-a-thread", (req, res, next) => {
    res.type('html')
    if (req.signedCookies.loginName) {
        res.type('html')
        res.end(`
    <h1>share?</h1>
    <form action="/post-a-thread" method="post">
      Title: <br>
      <input type="text" name="title"/><br>
      Content: <br>
      <textarea name="content" cols="30" rows="8"></textarea><br>
      <button>Post</button>
    </form>
  `)
    } else {
        res.end('only logged in user can post')
    }

})
app.post("/post-a-thread", (req, res, next) => {
    {
        var postInfo = req.body
        var post = {
            id: uuid(),
            title: postInfo.title,
            content: postInfo.content,
            timestamp: new Date().toISOString(),
            owner: req.signedCookies.loginName,
        }
        console.log("postInfo", postInfo);
        console.log("post", post);
        posts.push(post)
        console.log("posts", posts)
        fs.writeFileSync('./posts.json', JSON.stringify(posts, null, 2))
        res.end('post successfully')
    }
})
app.get('/post/:id', (req, res, next) => {
    var post = posts.find(it => it.id === req.params.id)
    res.type('html')
    res.write(
        `
        <h1>${post.title}</h1>
        <p>${post.content}</p>
        <p>${post.timestamp}</p>
        `
    )
    res.write(
        `
        <h1>comment this!</h1>
        <form action="/comment" method="post">
        <textarea name="comment"></textarea>
        <button type="submit">submit</button>
        </form>
        `
    )
    res.end()
})
app.get('/comment/:id', (req, res, next) => {
    var post = posts.find(it => it.id === req.params.id)
    res.type('html')
    res.write(
        `
        <h1>${post.title}</h1>
        <p>${post.content}</p>
        <p>${post.timestamp}</p>
        `
    )
    res.write(
        `
        <h1>comment this!</h1>
        <form action="/comment" method="post">
        <textarea name="comment"></textarea>
        <button type="submit">submit</button>
        </form>
        `
    )
    res.end()
})
app.listen(port, () => {
    console.log('listening on port', port)
})