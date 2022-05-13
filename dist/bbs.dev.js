"use strict";

var express = require('express');

var fs = require('fs');

var app = express();

var cookieParser = require('cookie-parser');

var port = 8080;

var uuid = require('uuid').v4;

app.locals.pretty = true;
app.set("views", __dirname + '/templates');
var users = JSON.parse(fs.readFileSync("./users.json"));
var posts = JSON.parse(fs.readFileSync("./posts.json"));
var comments = JSON.parse(fs.readFileSync("./comments.json"));
app.use(cookieParser("a secret"));
app.use(express.urlencoded({
  extended: true
})); // console.log("users ", users)
// app.use(express.urlencoded({ extended: true }))

app.use(function (req, res, next) {
  console.log(req.method, req.url);
  console.log("cookies", req.cookies);
  console.log("signedCookies", req.signedCookies);
  next();
});
app.get("/", function (req, res, next) {
  res.type("html");
  res.render("homepage.pug", {
    loginName: req.signedCookies.loginName,
    posts: posts
  });
});
app.get("/register", function (req, res, next) {
  console.log("register");
  res.type("html");
  res.end("\n        <form action=\"/register\" method=\"POST\">\n        <div>user name<input type=\"text\" name=\"name\"></div>\n        <div>email<input type=\"text\" name=\"email\"></div>\n        <div>password<input type=\"text\" name=\"password\"></div> \n        <div>passwordConfirm<input type=\"text\" name=\"passwordConfirm\"></div> \n        <button type=\"submit\">submit</button>\n        </form>\n        ");
});
app.post("/register", function (req, res, next) {
  var regInfo = req.body;
  console.log(regInfo);

  if (regInfo.password != regInfo.passwordConfirm) {
    res.end("not same passwords!");
  } // if (users.some(it => it.name === regInfo.name)) {
  //     res.end("already exists")
  // }
  // if (users.some(it => it.email == regInfo.email)) {
  //     res.end('email already exists')
  // }


  var user = {
    name: regInfo.name,
    email: regInfo.email,
    password: regInfo.password
  };
  console.log("users", users);
  res.type("html");
  res.end('register success, go <a href="/login">login</a>');
  users.push(user);
  fs.writeFileSync("./users.json", JSON.stringify(users, null, 2));
});
app.get("/login", function (req, res, next) {
  res.end("\n    <h1>Login</h1>\n    <form action=\"/login\" method=\"post\">\n      <div>Name: <input type=\"text\" name=\"name\"></div>\n      <div>Password: <input type=\"password\" name=\"password\"></div>\n      <button>Submit</button>\n    </form>\n  ");
});
app.post("/login", function (req, res, next) {
  var loginInfo = req.body;
  var target = users.find(function (it) {
    return it.name == loginInfo.name && it.password == loginInfo.password;
  });
  console.log(target);

  if (target) {
    res.cookie('loginName', target.name, {
      maxAge: 1000000000,
      signed: true
    });
    res.redirect('/');
  }
});
app.get('/logout', function (req, res, next) {
  res.clearCookie('loginName');
  res.redirect('/');
});
app.get("/post-a-thread", function (req, res, next) {
  res.type('html');

  if (req.signedCookies.loginName) {
    res.type('html');
    res.end("\n    <h1>share?</h1>\n    <form action=\"/post-a-thread\" method=\"post\">\n      Title: <br>\n      <input type=\"text\" name=\"title\"/><br>\n      Content: <br>\n      <textarea name=\"content\" cols=\"30\" rows=\"8\"></textarea><br>\n\n      <button>Post</button>\n    </form>\n  ");
  } else {
    res.end('only logged in user can post');
  }
});
app.post("/post-a-thread", function (req, res, next) {
  {
    var postInfo = req.body;
    var post = {
      id: uuid(),
      title: postInfo.title,
      content: postInfo.content,
      timestamp: new Date().toISOString(),
      owner: req.signedCookies.loginName
    };
    console.log("postInfo", postInfo);
    console.log("post", post);
    posts.push(post);
    fs.writeFileSync('./posts.json', JSON.stringify(posts, null, 2));
    res.end('post successfully');
  }
});
app.get('/post/:id', function (req, res, next) {
  var post = posts.find(function (it) {
    return it.id === req.params.id;
  }); // res.type('html')

  res.write("\n        <h1>".concat(post.title, "</h1>\n        <p>").concat(post.content, "</p>\n        <p>").concat(post.timestamp, "</p>\n        <p>by ").concat(post.owner, "</p>\n        "));
  console.log("comments", comments);
  var comments_of_post = comments.filter(function (it) {
    return it.postId === post.id;
  });
  console.log(comments_of_post);
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = comments_of_post[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var comment = _step.value;
      res.write("\n        <h1>".concat(comment.content, "</h1>\n        <p>by ").concat(comment.commentorName, "</p>\n        <p>").concat(comment.timeStamp, "</p>\n        "));
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator["return"] != null) {
        _iterator["return"]();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  res.write("\n        <h1>comment this!</h1>\n        <form action=\"/comment/".concat(post.id, "\" method=\"post\">\n        <textarea name=\"comment\"></textarea>\n        <button type=\"submit\">submit</button>\n        </form>\n        "));
  res.end();
});
app.post('/comment/:id', function (req, res, next) {
  console.log(req.body);
  var commentInfo = req.body;

  if (req.signedCookies.loginName) {
    var comment = {
      content: commentInfo.comment,
      timeStamp: new Date().toISOString(),
      commentorName: req.signedCookies.loginName,
      postId: req.params.id
    };
    comments.push(comment); // res.type("html")
    // res.write('comment successfully')

    res.redirect("/post/".concat(req.params.id));
  } else {
    res.end("\n        please login to comment :)\n        ");
  }

  fs.writeFileSync("./comments.json", JSON.stringify(comments, null, 2));
  console.log("ok");
});
app.listen(port, function () {
  console.log('listening on port', port);
});