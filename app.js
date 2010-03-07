#!/usr/bin/env node
var nerve = require('./lib/nerve');
var url = require('url');
var sys = require('sys');
var redisclient = require('./lib/redisclient');
var tmpl = require('./lib/template');
var client = new redisclient.Client();
var hashlib = require("./lib/hashlib");
var qs = require("querystring");

get = nerve.get
post = nerve.post

function getPostParams(req, callback){
  var body = '';
  req.addListener('data', function(chunk){
     body += chunk;
   })
   .addListener('end', function() {
     var obj = qs.parse( body.replace( /\+/g, ' ' ) );
     callback( obj );
   });
}

function template(template, data, layout) {
  var baseData = data;
  baseData['__innerContent'] = tmpl.tmpl("templates/" + template, data);
  return tmpl.tmpl(layout ? ("templates/layouts/" + layout) : "templates/layouts/application.template", baseData);
}


var hello = [
  ["/", function(req, res) {
    client.connect(function() {
      client.keys("domains.*", function(err, value) {
        client.close();
        var hater = req.session['hater-id'];
        var sites = value;
        if(sites == ['']) {
          sites = [];
        }
        res.respond(template("index.template", {hater: hater, sites: sites}));
      });
    });
  }],
  [ get(/^\/files\/(.*)$/), function(req, res, path) {
    nerve.serve_static_file("files/" + path, res);
  }],
  [get(/^\/STOP\/(http.*)$/), function(req, res, urli) {
    res.respond(tmpl.tmpl("templates/stop.template", {url: urli}));
  }],
  [post(/^\/add\/(http.*)$/), function(req, res, urli) {
    var parsedUrl = url.parse(urli)
    client.connect(function() {
      client.incr("domains." + parsedUrl.host, function(err, value) {
        client.close();
        if (!err) {
          res.respond(value);
        } else {
          res.respond("ERR");
        }
      });
    });
  }],
  [get(/^\/((http|https).*)$/), function(req, res, urli) {
    var parsedUrl = url.parse(urli);
    try {
      client.connect(function() {
        client.get("domains." + parsedUrl.host, function(err, value) {
          if (!err) {
            if (value == null) {value = 0;}
            res.respond("" + value);
          } else {
            res.respond("0");
          }
        })
      });
    } catch(e) {
      res.respond("0");
    }
  }],
  [get("/login"), function(req, res) {
    res.respond(tmpl.tmpl("templates/login.template", {}));
  }],
  [post("/login"), function(req, res) {
    getPostParams(req, function( obj ) {
      client.connect(function() {
        client.get("username:" + obj.email + ":uid", function(err, uid) {
          if (!err) {
            if (uid != null) {
              client.get("uid:" + uid + ":password", function(err, value) {
                if(!err) {
                  sys.puts("saved: " + value);
                  sys.puts("hashed: " + hashlib.sha1(obj.password));
                  if (value == hashlib.sha1(obj.password)) {
                    req.session['hater-id'] = obj.email
                    res.respond({status_code: 301, headers: {Location: "/"}, content: "Location: /"})
                  } else {
                    res.respond({status_code: 301, headers: {Location: "/login"}, content: "Location: /login"})
                  }
                } else {
                  res.respond({status_code: 301, headers: {Location: "/login"}, content: "Location: /login"})
                }
              });
            } else {
              res.respond({status_code: 301, headers: {Location: "/login"}, content: "Location: /login"})
            }
          } else {
            res.respond({status_code: 301, headers: {Location: "/login"}, content: "Location: /login"})
          }
        });
      });
    });
  }],
  [get("/register"), function(req, res) {
    res.respond(tmpl.tmpl("templates/register.template", {}));
  }],
  [post("/register"), function(req, res) {
    getPostParams(req, function( obj ) {
        client.connect(function() {
          client.incr("global:nextUserId", function(err, value) {
            if (!err) {
              client.set("uid:" + value + ":username", obj.email);
              client.set("uid:" + value + ":password", hashlib.sha1(obj.password));
              client.set("username:" + obj.email + ":uid", value);
            }
            client.close();
            req.session["hater-id"] = obj.email;
            res.respond({status_code: 301, headers: {Location: "/"}, content: "Location: /"})
          })
        });
    });
  }]
];

nerve.create(hello).listen(8000);