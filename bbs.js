// BBS by Serene :)
const express = require('express');
const fs = require('fs');
const app = express();
const cookieParser = require('cookie-parser');
const { resourceUsage } = require('process');
const port = 8080
const uuid = require('uuid').v4
const svgCaptcha = require('svg-captcha')
const md5 = require('md5')
const Database = require("better-sqlite3")
const db = new Database("./bbs.sqlite3")
const formidable = require('formidable')



app.locals.pretty = true
app.set("views", __dirname + '/templates')



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
    // console.log("middleware", sessionObjects)
    next()
})
app.use(function(req, res, next) {
    if (req.signedCookies.loginName) {
        req.loginUser = db.prepare("SELECT rowid as loginUserId,name,email FROM users WHERE name = ?").get(req.signedCookies.loginName)
    } else {
        req.loginUser = null
    }

    next()
})
app.use((req, res, next) => {
    console.log(req.method, req.url)

    // console.log("cookies", req.cookies)
    // console.log("signedCookies", req.signedCookies)
    next()
})


app.use((req, res, next) => {
    console.log(req.method, req.url)

    // console.log("cookies", req.cookies)
    // console.log("signedCookies", req.signedCookies)
    next()
})


app.use(express.static(__dirname + '/assets'))
app.use(express.static(__dirname + '/uploads'))
app.get("/", (req, res, next) => {

    res.type("html")
    var posts = db.prepare(`SELECT posts.rowid AS postId, title,content,createdAt,userId,name,avatar 
    FROM posts JOIN users ON posts.userId = users.rowid 
    ORDER BY createdAt DESC`).all()
    console.log("/ posts", posts)
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
    const form = formidable({
        multiples: true,
        keepExtensions: true,
        uploadDir: "./uploads"


    })
    var activateNumber = uuid().slice(0, 4)
    form.parse(req, (err, fields, files) => {
        var regInfo = fields
        var avatar = files.avatar
        console.log("regInfo", regInfo,
            "files", files)
        if (regInfo.password != regInfo.passwordConfirm) {
            res.end("not same passwords!")
            return
        }
        var user = {
            name: regInfo.name,
            email: regInfo.email,
            password: regInfo.password,
            avatar: files.avatar.newFilename,
            avtivated: activateNumber
        }

        try {
            db.prepare("INSERT INTO users (name, email, password,avatar,activated) VALUES (?,?,?,?,?)").run(user.name, user.email, user.password, user.avatar, user.avtivated)
        } catch (e) {
            console.log(e)
            if (e.code == 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                res.type("html").end("username or email already exists")
            } else {
                throw e
            }
        }
        var activateLink = `http://${req.get("host")}/account-activate/${activateNumber}`
        res.type("html")
        res.end('please click the activate link that has been sent to your email' + `     ` + activateLink)
    })
})
app.get("/account-activate/:activeId", (req, res, next) => {
    var user = db.prepare("SELECT rowid, * FROM users WHERE activated = ?").get(req.params.activeId)
    if (user) {
        db.prepare("UPDATE users SET activated = null where rowid = ?").run(user.rowid)
        res.type("html").end("login")
    }
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
        // console.log(loginInfo)
        // console.log("req.session: ", req.session)
        // console.log(req.body.captcha, req.session.captcha)
    if (req.body.captcha && req.body.captcha !== req.session.captcha) {
        req.session.login_failure_reason = "wrong captcha 🤗"
        res.redirect("/login")
        return
    }
    console.log("loginInfo.password", loginInfo.password)
        // var target = users.find(it => it.name == loginInfo.name && it.password == loginInfo.password)
        // console.log("target", target)
    var target = db.prepare("SELECT * FROM users WHERE name = $name AND password = $password")
        .get(loginInfo)


    if (target) {
        console.log("target.password", target.password)
        res.cookie('loginName', target.name, {
            maxAge: 1000000000,
            signed: true,
        })
        req.session.loginFailureCount = 0
        req.session.login_failure_reason = false
        res.redirect('/')
    } else {
        var target = db.prepare("SELECT * FROM users WHERE name = $name").get(loginInfo)
        if (target) {
            req.session.loginFailureCount = (req.session.loginFailureCount ? req.session.loginFailureCount : 0) + 1
            req.session.login_failure_reason = "invalid password 😶"
            res.redirect("/login")
        } else {
            res.render('register.pug', { notExist: true })



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

    var postInfo = req.body
    var user = db.prepare("SELECT rowid as id,* FROM users WHERE name = ?").get(req.signedCookies.loginName)
    console.log("database post a thread", user, req.signedCookies.loginName)
        // the userId in post is users.id is uers.rowid
    var post = {

            title: postInfo.title,
            content: postInfo.content,
            createdAt: new Date().toISOString(),
            userId: user.id,
        }
        // console.log("postInfo", postInfo);
        // console.log("post", post);
    var info = db.prepare("INSERT INTO posts (title,content,createdAt,userId) VALUES (:title,:content,:createdAt,:userId)").run(post)
    res.redirect('/post/' + info.lastInsertRowid)

})


app.get('/post/:id', (req, res, next) => {
    var postId = req.params.id
    var post = db.prepare(
        `SELECT posts.rowid AS postId, title,content,createdAt,userId,name,avatar
        FROM posts JOIN users ON posts.userId = users.rowid 
        where postId = ?
        `
    ).get(postId)
    console.log("post", post)
    res.type("html")
    if (post) {
        var comments_of_post = db.prepare(`SELECT comments.rowid AS commentId,content,createdAt,userId,name,avatar
        FROM comments 
        JOIN users ON comments.userId = users.rowid 
        WHERE comments.postId = ?`).all(postId)
        var loginName = req.signedCookies.loginName
        res.render("post.pug", {
            loginName: req.signedCookies.loginName,
            comments: comments_of_post,
            post: post,
            user: req.loginUser

        })
    } else {
        res.render("404.pug")
    }




})


app.post('/comment/:id', (req, res, next) => {
    console.log(req.body)
    var commentInfo = req.body
    var user = db.prepare("SELECT rowid,* FROM users WHERE name = ?").get(req.signedCookies.loginName)
    console.log(user)
    if (user) {
        var comment = {
            content: commentInfo.content,
            createdAt: new Date().toISOString(),
            userId: user.rowid,
            postId: req.params.id
        }
        var insertInfo = db.prepare("INSERT INTO comments VALUES ($content,$createdAt,$userId,$postId)").run(comment)

        // res.type("html")
        // res.write('comment successfully')
        res.json({
            userId: user.rowid,
            userName: user.name,
            commentId: insertInfo.lastInsertRowid
        })
    } else {
        res.end(`
        please login to comment :)
        `)
    }


    console.log("ok")


})


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

app.delete("/post/:id", function(req, res, next) {
    // console.log("delete")
    // console.log("req.signedCookies.loginName", req.signedCookies.loginName)

    if (req.loginUser) {
        var post = db.prepare("SELECT * FROM posts WHERE rowid = ?").get(req.params.id)
        console.log("delete post", post)
        if (post) {
            if (post.userId == req.loginUser.loginUserId) {

                db.prepare("DELETE FROM posts WHERE rowid = ?").run(req.params.id)
                res.end("delete successfully")

            }
        } else {

            res.end("already deleted")
        }
    } else {
        res.end("not log in" + String.fromCodePoint(0x1F621))
    }
})

app.delete("/comment/:commentId", function(req, res, next) {
    // console.log("delete")
    // console.log("req.signedCookies.loginName", req.signedCookies.loginName)

    if (req.loginUser) {
        var comment = db.prepare("SELECT * FROM comments WHERE rowid = ?").get(req.params.commentId)
        if (comment.userId == req.loginUser.loginUserId) {
            db.prepare("DELETE FROM comments WHERE rowid = ?").run(req.params.commentId)
            res.end("ok")
            console.log("delete my comment")
        } else {
            var post = db.prepare("SELECT * FROM comments WHERE rowid = ?").get(comment.postId)
            if (post.userId == req.loginUser.loginUserId) {
                db.prepare("DELETE FROM comments WHERE rowid = ?").run(req.params.commentId)
                res.end("ok your post")
                console.log("delete my post's comment")
            } else {
                res.end("it is not your comment")
            }
        }

    } else {

    }
})


app.listen(port, () => {
    console.log('listening on port', port)
})