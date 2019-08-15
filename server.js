'use strict';

var dns = require('dns');
var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);
var cors = require('cors');
var app = express();
var bodyParser = require("body-parser");

// Basic Configuration 
var port = process.env.PORT || 3000;
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use('/public', express.static(process.cwd() + '/public'));
app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

// Mongoose and MongoDB Stuff
let urlSchema = mongoose.Schema({
  originalUrl: {
    type: String,
    required: true
  },
  shortenedUrl: {
    type: String,
    unique: true
  }
})
let Url = mongoose.model('Url', urlSchema);


// API endpoints
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

function getUrlQueryNew(url, callback){
  var query = Url.find({originalUrl: url}, (err, data) => {
    if (data.length != 0){
      callback(err, false);
    } else {                
      callback(err, true);
    }
   });
}

function getExistingShortUrl(name, callback){
  var query = Url.find({originalUrl: name}, (err, data) => {
    callback(err, data[0]);
  });
}

function getOriFromShortUrl(name, callback){
  var query = Url.find({shortenedUrl: name}, (err, data) => {
    callback(err, data[0]);
  });
}

app.post("/api/shorturl/new", (req, res) => {
  const rg = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  if (rg.test(req.body.url)) 
  {
    const cleanURL = req.body.url.replace(/(^\w+:|^)\/\//, '');
    dns.lookup(cleanURL, (err, address, family) => {
      if (err){res.json({error: "invalid URL"});} 
      else {
        getUrlQueryNew(req.body.url, (err, data) => {
          if (err) {console.log("error")}
          if (data) {
            const currTime = new Date();
            const short = currTime.getTime().toString();
            const newShortened = new Url({originalUrl: req.body.url, shortenedUrl: short});
            newShortened.save((err) => {
              if (err) { return res.send("Error creating new url entry on the db"); }
            });
            res.json({original_url: req.body.url, short_url: short});
          } else {
            getExistingShortUrl(req.body.url, (err, data) => {
              const ori = data.originalUrl;
              const short = data.shortenedUrl;
              res.json({original_url: ori, short_url: short})
            });
          }
        })
      }
    });    
  } 
  else 
  {
    res.json({error: "invalid URL"});
  }
})

app.get("/api/shorturl/:short", (req, res) => {
  // res.send(req.params.short);
  getOriFromShortUrl(req.params.short, (err, data) => {
    if (data == undefined) {
      res.send("URL Does not exist!")
    } else {
      const ori = data.originalUrl;
      const short = data.shortenedUrl;
      // res.json({original_url: ori, short_url: short});
      res.redirect(ori);
    }
    
  });
})


// Check if server is doing well
app.listen(port, function () {
  console.log('Node.js listening ...');
});