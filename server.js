'use strict';

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dns = require('dns');
const urlMod = require('url');
const autoIncrement = require('mongoose-auto-increment');

const app = express();

const port = process.env.PORT || 3000;

//auto-increment only needs to be initialized once
const connection = mongoose.createConnection(process.env.MONGO_URI);
autoIncrement.initialize(connection);

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

const Schema = mongoose.Schema
const URLSchema = new Schema({url: { type: String, unique: true, lowercase: true }})
URLSchema.plugin(autoIncrement.plugin, 'URL')//{ model:'URL', field: 'shortURL' });
var URL = connection.model("URL", URLSchema)


//api to create or retrieve shortened link for given url
app.post("/api/shorturl/new", (req, res) => {
  let givenURL = req.body.url;  
  dns.lookup(urlMod.parse(givenURL).host || givenURL, (err, address) => {
    if(err || address == null){
      res.json({"error": "invalid URL"});
    } else {
      URL.findOne({url: givenURL}, (err, shortURL) => {
        if(err) {
          res.json({ "error": "failed to read database" });
        } else if (shortURL == null) {
          URL.create({ url: givenURL}, (err, shortURL) => {
            if(err ) {
              res.json({ error: "failed to write to database" });
            } else {
              res.json({"original_url": givenURL, "short_url": req.protocol + '://' + req.get('host') + "/api/shorturl/" + shortURL.id});
            }
          });
        } else {
          res.json({"original_url": givenURL, "short_url": req.protocol + '://' + req.get('host') + "/api/shorturl/" + shortURL.id});
        }
      });      
    }
  });
});

//api to redirct from shortended url
app.get("/api/shorturl/:id", (req, res) => {
  URL.findById(req.params.id, (err, shortURL) => {
    if(err) {
      res.send("unable to reach URL");
    } else if (shortURL == null) {
      res.send("URL does not exist");
    } else {
      res.redirect(shortURL.url);
    }
  });
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});