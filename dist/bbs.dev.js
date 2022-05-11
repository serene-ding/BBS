"use strict";

var express = require('express');

var fs = require('fs');

var app = express();

var cookieParser = require('cookie-parser');

var port = 8080;

var uuid = require('uuid').v4;

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
  console.log(posts);

  if (req.signedCookies.loginName || req.cookies.loginName) {
    res.write("\n      <div><a href=\"/\">homepage</a></div>\n      <div>welcome back, ".concat(req.signedCookies.loginName ? req.signedCookies.loginName : req.cookies.loginName, "</div>\n      <div><a href=\"/post-a-thread\">post</a></div>\n      <div><a href=\"/logout\">Logout</a></div>\n    "));
  } else {
    res.write("\n      <div><a href=\"/\">homepage</a></div>\n      <div><a href=\"/register\">Register</a></div>\n      <div><a href=\"/post-a-thread\">post</a></div>\n      <div><a href=\"/login\">Login</a></div>\n    ");
  }

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = posts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var post = _step.value;
      res.write("<div><a href=\"/post/".concat(post.id, "\">").concat(post.title, "</a></div>"));
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
    res.end("\n    <h1>share?</h1>\n    <form action=\"/post-a-thread\" method=\"post\">\n      Title: <br>\n      <input type=\"text\" name=\"title\"/><br>\n      Content: <br>\n      <textarea name=\"content\" cols=\"30\" rows=\"8\"></textarea><br>\n      <button>Post</button>\n    </form>\n  ");
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
    console.log("posts", posts);
    fs.writeFileSync('./posts.json', JSON.stringify(posts, null, 2));
    res.end('post successfully');
  }
});
app.get('/post/:id', function (req, res, next) {
  var post = posts.find(function (it) {
    return it.id === req.params.id;
  });
  res.type('html');
  res.write("\n        <h1>".concat(post.title, "</h1>\n        <p>").concat(post.content, "</p>\n        <p>").concat(post.timestamp, "</p>\n        "));
  res.write("\n        <h1>comment this!</h1>\n        <form action=\"/comment\" method=\"post\">\n        <textarea name=\"comment\"></textarea>\n        <button type=\"submit\">submit</button>\n        </form>\n        ");
  res.end();
});
app.get('/comment/:id', function (req, res, next) {
  var post = posts.find(function (it) {
    return it.id === req.params.id;
  });
  res.type('html');
  res.write("\n        <h1>".concat(post.title, "</h1>\n        <p>").concat(post.content, "</p>\n        <p>").concat(post.timestamp, "</p>\n        "));
  res.write("\n        <h1>comment this!</h1>\n        <form action=\"/comment\" method=\"post\">\n        <textarea name=\"comment\"></textarea>\n        <button type=\"submit\">submit</button>\n        </form>\n        ");
  res.end();
});
app.listen(port, function () {
  console.log('listening on port', port);
});