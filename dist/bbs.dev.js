"use strict";

var express = require('express');

var fs = require('fs');

var app = express();

var cookieParser = require('cookie-parser');

var port = 8080;
var users = JSON.parse(fs.readFileSync("./users.json"));
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
  if (req.signedCookies.loginName || req.cookies.loginName) {
    res.end("\n      <div><a href=\"/\">homepage</a></div>\n      <div>welcome back, ".concat(req.signedCookies.loginName ? req.signedCookies.loginName : req.cookies.loginName, "</div>\n      <div><a href=\"/postAThread\">post</a></div>\n      <div><a href=\"/logout\">Logout</a></div>\n    "));
  } else {
    res.end("\n      <div><a href=\"/\">homepage</a></div>\n      <div><a href=\"/register\">Register</a></div>\n      <div><a href=\"/login\">Login</a></div>\n    ");
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
    }).cookie('hello', 'notKnown');
    res.redirect('/');
  }
});
app.get('/logout', function (req, res, next) {
  res.clearCookie('loginName');
  res.redirect('/');
});
app.get("/postAThread", function (req, res, next) {
  res.type("html");
  res.end("\n        <h1>postAThread</h1>\n        <form method=\"post\" action>\n        Title<br>\n        <input type=\"text\" name=\"title\">\n        Content<br>\n        <textarea name=\"content\"></textarea>\n        </form>\n        ");
});
app.listen(port, function () {
  console.log('listening on port', port);
});