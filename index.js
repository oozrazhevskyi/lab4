var express = require('express');
var session = require('express-session');
var app = express();

var bodyParser = require('body-parser');
var cookieParser = require("cookie-parser");

var crypto = require('crypto');

var pgp = require("pg-promise")({capSQL: true});
var db = pgp("postgres://oubvjzjz:19n6Ryn_5MsRkQoYuLQbQ5ueumkUI3X1@abul.db.elephantsql.com/oubvjzjz");



const secret = "doQw9fbF(}#?cdYPb3I[q1#B[\\5gHzbn,9_=oRf!&Z?#mfNRE#";
const hashsalt = "e%$0XEmBFwBIV618+4i#ZP:+,r9&20O[&sAh |=9[L3[k$517O";

app.use(express.static('static'));
app.set('view engine', 'ejs');
app.use(
  bodyParser.urlencoded({
    extended: true
  })
)
app.use(cookieParser());
app.use(session({
  secret: secret,
  saveUninitialized: true
}));

app.get("/signup", function (req, res){
  res.render('signup.ejs');
})

app.post("/signup", async (req, res) => {
  try {
    const { name, email, phoneprefix, phone, job, password, repeatedpassword } = req.body;

    if (!(name && email && phoneprefix && phone && job && password && repeatedpassword)) {
      res.render("error.ejs", {"reason": "All input is required"});
    }
    else if (password !== repeatedpassword){
      res.render("error.ejs", {"reason": "Passwords does not match"});
    } else {
      const oldUser = await db.oneOrNone("SELECT * FROM users WHERE email=$<email>" , {email:email});

      if (oldUser) {
        return res.render("error.ejs",{"reason": "User already exist. Please login"});
      } else {
        hashedPassword = crypto.createHash('sha256').update(password).update(hashsalt).digest('hex');
        var data = {
          name: name,
          email: email.toLowerCase(),
          phone: phoneprefix+phone,
          job: job,
          password: hashedPassword
        };
        var query = pgp.helpers.insert(data, null, 'users') + 'RETURNING id';
        const userid = await db.one(query);

        req.session.userid=userid;
        req.session.username=name;

        res.redirect('/');
      }
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/login", function(req, res){
  if(req.session.userid){
    res.redirect("/");
  }
  else{
    res.render("login.ejs")
  }
})

app.post("/login", async (req, res)=>{
  try {
    const { email, password, rememberme } = req.body;

    if (!(email && password)) {
      res.render("error.ejs",{"reason": "All input is required"});
    }

    db.one("SELECT * FROM users WHERE email=$<email>" , {email:email})
    .then((user)=>{
      hashedPassword = crypto.createHash('sha256').update(password).update(hashsalt).digest('hex');

      if (user.password !== hashedPassword){
        res.render("error.ejs",{"reason": "Password is invalid"});
      } else {
        req.session.userid=user.id;
        req.session.username=user.name;
        if(rememberme){
          req.session.cookie.maxAge = 1000 * 60 * 60;
        } else {
          req.session.cookie.maxAge = null;
        }
        res.redirect('/');
      }
    })
    .catch((err)=>{
      res.render("error.ejs", {"reason": "This user does not exist"});
    });
  } catch (err) {
    console.log(err);
  }
})

app.get("/logout", function(req, res){
  if(req.session.userid){
    req.session.destroy();
  }
  res.redirect("/");
})

app.get("/", function(req, res){
  res.render('index.ejs', {user:req.session})
})

var server = app.listen(80, function () {
   console.log("Started at http://localhost:80/");
})