// BBS by Serene :)
const express = require('express');
const fs = require('fs');
const app = express();
const cookieParser = require('cookie-parser');
const { resourceUsage } = require('process');
const port = 8080
const uuid = require('uuid').v4
const svgCaptcha = require('svg-captcha')





app.locals.pretty = true
app.set("views", __dirname + '/templates')
var users = JSON.parse(fs.readFileSync("./users.json"));
var posts = JSON.parse(fs.readFileSync("./posts.json"));
var comments = JSON.parse(fs.readFileSync("./comments.json"));
app.use(cookieParser("a secret"))
app.use(express.urlencoded({ extended: true }))

var sessionObjects = {}
app.use(function sessionMiddleware(req, res, next) {
    if (req.cookies.sessionId) {

    } else {
        var sessionId = uuid()
        res.cookie("sessionId", sessionId)
        req.cookies.sessionId = sessionId

    }
    if (sessionObjects[req.cookies.sessionId]) {
        req.session = sessionObjects[req.cookies.sessionId]
    } else {
        req.session = (sessionObjects[req.cookies.sessionId] = {})
    }
    console.log("middleware", sessionObjects)
    next()
})

app.use((req, res, next) => {
    console.log(req.method, req.url)

    console.log("cookies", req.cookies)
    console.log("signedCookies", req.signedCookies)
    next()
})

app.use
app.use((req, res, next) => {
    console.log(req.method, req.url)

    console.log("cookies", req.cookies)
    console.log("signedCookies", req.signedCookies)
    next()
})


app.use(express.static(__dirname + '/assets'))
app.get("/", (req, res, next) => {

    res.type("html")

    res.render('index.pug', {
        posts: posts,
        loginName: req.signedCookies.loginName
    })
})
app.get("/register", (req, res, next) => {
    console.log("register")
    res.type("html")
    res.render("register.pug")



})

app.post("/register", (req, res, next) => {
    var regInfo = req.body
    console.log(regInfo)
    if (regInfo.password != regInfo.passwordConfirm) {
        res.end("not same passwords!")
        return
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
    var returnUrl = req.get('referer') ? req.get('referer') : '/'
    console.log("get login", req.session)
    res.render('login.pug', {
        returnUrl: returnUrl,
        session: req.session
    })
    console.log("get login sessionObject", sessionObjects)
})

app.post("/login", function(req, res, next) {
    var loginInfo = req.body
    console.log(loginInfo)
    console.log("req.session: ", req.session)
    console.log(req.body.captcha, req.session.captcha)
    if (req.body.captcha && req.body.captcha !== req.session.captcha) {
        req.session.login_failure_reason = "wrong captcha 🤗"
        res.redirect("/login")
        return
    }

    var target = users.find(it => it.name == loginInfo.name && it.password == loginInfo.password)
    console.log("target", target)
    if (target) {
        res.cookie('loginName', target.name, {
            maxAge: 1000000000,
            signed: true,
        })
        req.session.loginFailureCount = 0
        req.session.login_failure_reason = false
        res.redirect('/')
    } else {
        if (users.find(it => it.name == loginInfo.name)) {
            req.session.loginFailureCount = (req.session.loginFailureCount ? req.session.loginFailureCount : 0) + 1
            req.session.login_failure_reason = "invalid password 😶"
            res.redirect("/login")
        } else {
            res.render('accountNotFound.pug')
        }

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

        fs.writeFileSync('./posts.json', JSON.stringify(posts, null, 2))
        res.redirect('/post/' + post.id)
    }
})


app.get('/post/:id', (req, res, next) => {
    var post = posts.find(it => it.id === req.params.id)
    console.log("post", post)
    res.type("html")
    if (post) {
        var comments_of_post = comments.filter(it => { return it.postId === post.id })
        var loginName = req.signedCookies.loginName
        res.render("post.pug", {
            loginName: req.signedCookies.loginName,
            comments: comments_of_post,
            post: post
        })
    } else {
        res.render("404.pug")
    }




})


app.post('/comment/:id', (req, res, next) => {
    console.log(req.body)
    var commentInfo = req.body
    if (req.signedCookies.loginName) {
        var comment = {
            content: commentInfo.comment,
            timeStamp: new Date().toISOString(),
            commentorName: req.signedCookies.loginName,
            postId: req.params.id
        }
        comments.push(comment)

        // res.type("html")
        // res.write('comment successfully')
        res.redirect(`/post/${req.params.id}`)
    } else {
        res.end(`
        please login to comment :)
        `)
    }

    fs.writeFileSync("./comments.json", JSON.stringify(comments, null, 2))
    console.log("ok")


})


var captchaText = {}
app.get("/captcha", (req, res, next) => {
    var captcha = svgCaptcha.create({
        color: true,
        noise: 3,
    })
    req.session.captcha = captcha.text
    console.log("get captcha sessionObjects", sessionObjects)
    console.log(req.session)
    res.type("svg").end(captcha.data)
    console.log("req.session.captcha", req.session.captcha)
})


app.listen(port, () => {
    console.log('listening on port', port)
})