const express = require('express');
const fs = require('fs');
const app = express();
const cookieParser = require('cookie-parser');
const port = 8080

var users = JSON.parse(fs.readFileSync("./users.json"));
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


    if (req.signedCookies.loginName || req.cookies.loginName) {
        res.end(`
      <div><a href="/">homepage</a></div>
      <div>welcome back, ${req.signedCookies.loginName?req.signedCookies.loginName:req.cookies.loginName}</div>
      <div><a href="/postAThread">post</a></div>
      <div><a href="/logout">Logout</a></div>
    `)
    } else {
        res.end(`
      <div><a href="/">homepage</a></div>
      <div><a href="/register">Register</a></div>
      <div><a href="/login">Login</a></div>
    `)
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
        }).cookie('hello', 'notKnown')
        res.redirect('/')
    }

})

app.get('/logout', (req, res, next) => {
    res.clearCookie('loginName')
    res.redirect('/')
})
app.get("/postAThread", (req, res, next) => {
    res.type("html")
    res.end(
        `
        <h1>postAThread</h1>
        <form method="post" action>
        Title<br>
        <input type="text" name="title">
        Content<br>
        <textarea name="content"></textarea>
        </form>
        `
    )
})
app.listen(port, () => {
    console.log('listening on port', port)
})