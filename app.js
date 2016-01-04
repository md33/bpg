
/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , home = require('./routes/home')
  , overlook = require('./routes/overlook')
  , socketio = require('socket.io')
  , mysql = require('mysql')
  , http = require('http')
  , path = require('path')
  , cookieSession = require('cookie-session')
  , cookieParser = require('cookie-parser');

var app = express();
app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('trust proxy', 1);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(cookieParser());
  app.use(cookieSession({name: 'session', keys: ['uwotm8', 'SEKR37']}))
});

app.configure('development', function() {
  app.use(express.errorHandler());
});

var pool = mysql.createPool({
  host     : 'localhost',
  port     : '3306',
  user     : 'root',
  password : '',
  database : 'bpg'
});

app.get('/', routes.index);
app.get('/users', user.list);

var server = app.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});

var io = socketio.listen(server);

var clients = {};
var socketsOfClients = {};

io.sockets.on('connection', function(socket) {
  socket.on('set username', function(userName) {
    // Is this an existing user name?
    if (clients[userName] === undefined) {
      // Does not exist ... so, proceed
      clients[userName] = socket.id;
      socketsOfClients[socket.id] = userName;
      userNameAvailable(socket.id, userName);
      userJoined(userName);
    } 
    else
    if (clients[userName] === socket.id) {
      // Ignore for now
    } 
    else {
      userNameAlreadyInUse(socket.id, userName);
    }
  });

  socket.on('selectroad', function(msg) {
    var srcUser;
    if (msg.inferSrcUser) {
      // Infer user name based on the socket id
      srcUser = socketsOfClients[socket.id];
    } 
    else {
      srcUser = msg.source;
    }
    if (msg.target == "All") {
      io.sockets.emit('selectroad', 
      {
        "source": srcUser,
        "originLat": msg.originLat, 
        "originLng": msg.originLng, 
        "destinationLat": msg.destinationLat, 
        "destinationLng": msg.destinationLng,
        "targe": msg.target,     
        "name": msg.name
      });
    }
    else {
    }
  });

  socket.on('message', function(msg) {
    var srcUser;
    if (msg.inferSrcUser) {
      // Infer user name based on the socket id
      srcUser = socketsOfClients[socket.id];
    } else {
      srcUser = msg.source;
    }
    if (msg.target == "All") {
      // broadcast
      io.sockets.emit('message',
          {
            "source": srcUser,
            "lat": msg.lat,
            "lng": msg.lng,
            "target": msg.target
          });
    } else {
      // Look up the socket id
      io.sockets.to(clients[msg.target]).emit('message', 
          {"source": srcUser,
           "message": msg.message,
           "target": msg.target});
    }
  });

  socket.on('disconnect', function() {
    var uName = socketsOfClients[socket.id];
    delete socketsOfClients[socket.id];
    delete clients[uName];
    // relay this message to all the clients
    userLeft(uName);
  });
})

function userJoined(uName) {
  Object.keys(socketsOfClients).forEach(function(sId) {
    // console.log(io.sockets.to(sId));
    io.sockets.to(sId).emit('userJoined', { "userName": uName });
  })
}

function userLeft(uName) {
  io.sockets.emit('userLeft', { "userName": uName });
}

function userNameAvailable(sId, uName) {
  setTimeout(function() {
    console.log('Sending welcome msg to ' + uName + ' at ' + sId);
    // console.log(JSON.stringify(Object.keys(clients))); 
    io.sockets.to(sId).emit('welcome', { 
    "userName" : uName, "currentUsers": JSON.stringify(Object.keys(clients)) 
  });
  }, 500);
}

function userNameAlreadyInUse(sId, uName) {
  setTimeout(function() {
    io.sockets.sockets[sId].emit('error', { "userNameInUse" : true });
  }, 500);
}

function executeQuery(query, callback) {
  pool.getConnection(function (err, connection) {
      if (err) {
          return callback(err, null);
      }
      else if (connection) {
          connection.query(query, function (err, rows, fields) {
              connection.release();
              if (err) {
                  return callback(err, null);
              }
              return callback(null, rows);
          })
      }
      else {
          return callback(true, "No Connection");
      }
  });
}

function getResult(query, callback) {
  executeQuery(query, function (err, rows) {
    if (!err) {
      callback(null, rows);
    }
    else {
      callback(true, err);
    }
  });
}

var adminId = 0;
var userId = 0;

app.post('/', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var query = 'SELECT COUNT(*) AS CNT, Id FROM _Admin WHERE `Username` = "' + username + '" AND `Password` = "' + password + '";'; 
  getResult(query, function(err, admin) {
    if (err) throw err;
    if(admin[0].CNT > 0) {
      adminId = admin[0].Id;
      res.redirect('/home/0');
    }
    else {
      res.redirect('/');
    }
  });  
});

app.get('/home', function(req, res) {
  console.log('adminId ' + adminId);
  var query = 'SELECT * FROM _Admin WHERE `Id` = ' + adminId + ';';
  getResult(query, function(err, admin) {
    if (err) throw err;
    query = 'SELECT * FROM _User WHERE `AdminId` = ' + adminId + ';'; 
    getResult(query, function(err, users) {
      if (err) throw err;
      query = 'SELECT * FROM _Group WHERE `AdminId` = ' + adminId + ';';
      getResult(query, function(err, groups) {
        if (err) throw err;
        if (req.param('status') == undefined) {
          res.render('home', {admin: admin[0], users: users, groups: groups});
        }
        else {
          if (req.param('status') == 0) {
            res.render('home', {admin: admin[0], users: users, groups: groups, status: 'Таны нэмхийг хүссэн хэрэглэгч гар утсандаа энэхүү аплекейшнийг суулгаагүй байна.'});  
          }
          else {  
            res.render('home', {admin: admin[0], users: users, groups: groups, status: 'Хэрэглэгчийг амжилттай нэмлээ.'});  
          }
          console.log(req.param('status'));
        }
        res.end();
      });
    });
  });
});

app.post('/group', function(req, res) {
  var groupname = req.body.groupName;
  var description = req.body.groupDescription;
  var query = 'INSERT INTO _Group(Name, Description, AdminId) VALUES("' + groupname +'", "' + description + '", ' + adminId + ');'; 
  getResult(query, function(err, users) {
    if (err) throw err;
    res.redirect('/home');
  });
});

app.get('/home/:id', function(req, res) {
  var query = 'SELECT * FROM _Admin WHERE `Id` = ' + adminId + ';';
  getResult(query, function(err, admin) {
    if(req.params.id == 0) {
      query = 'SELECT * FROM _User WHERE `AdminId` = + ' + adminId + ';'; 
    }
    else {
      query = 'SELECT * FROM _User WHERE `AdminId` = 1 AND `GroupId` = ' + req.params.id + ';';   
    }
    getResult(query, function(err, users) {
      if (err) throw err;
      query = 'SELECT * FROM _Group WHERE `AdminId` = ' + adminId + ';';
      getResult(query, function(err, groups) {
        if (err) throw err;
        if (req.param('status') == undefined) {
          res.render('home', {admin: admin[0], users: users, groups: groups, grid: req.params.id});
        }
        else {
          if (req.param('status') == 0) {
            res.render('home', {admin: admin[0], users: users, groups: groups, grid: req.params.id, status: 'Таны нэмхийг хүссэн хэрэглэгч гар утсандаа энэхүү аплекейшнийг суулгаагүй байна.'});  
          }
          else {  
            res.render('home', {admin: admin[0], users: users, groups: groups, grid: req.params.id, status: 'Хэрэглэгчийг амжилттай нэмлээ.'});  
          }
          console.log(req.param('status'));
        }
        res.end();
      });
    });
  });
});

app.post('/user/:id', function(req, res) {
  var newUser = req.body.newUser;
  var groupId = req.body.group;
  var query = 'SELECT COUNT(*) AS CNT FROM _User WHERE `IdCode` = "' + newUser + '";'; 
  getResult(query, function(err, users) {
    if (err) throw err;
    if(users[0].CNT > 0) {
      query = 'UPDATE _User SET `AdminId` = ' + adminId + ', `GroupId` = ' + groupId + ' WHERE `IdCode` = "' + newUser + '";';
      getResult(query, function(err, user) {
        if (err) throw err;
        res.redirect('home/' + req.params.id + '?status=1');

      });
    }
    else {
      res.redirect('home/' + req.params.id + + '?status=0');
    }
  }); 
});  

app.get('/overlook', function(req, res) {
  var query = 'SELECT * FROM _Admin WHERE `Id` = ' + adminId + ';';
  getResult(query, function(err, admin) {
    query = 'SELECT * FROM _MarkedPlace WHERE `UserId` = ' + userId + ';'; 
    getResult(query, function(err, markedplaces) {
      if (err) throw err;
      if (req.param('status') == undefined) {
        res.render('overlook', {admin: admin[0], markedplaces: markedplaces});
      }
      else {
        if (req.param('status') == 0) {
          res.render('overlook', {admin: admin[0], markedplaces: markedplaces, status: 'Таны тэмдэглэсэн замыг хадгалахад алдаа гарлаа та дахин оролдоно уу.'});  
        }
        else {  
          res.render('overlook', {admin: admin[0], markedplaces: markedplaces, status: 'Таны тэмдэглэсэн замыг амжилттай хадгаллаа.'});  
        }
        console.log("info insert new road " + req.param('status'));
      }
      res.end();
    });
  });
});

// change user 
app.post('/changeuser', function(req, res) {
  console.log('Change user ' + req.body.userid);
  userId = req.body.userid;
});

// delete user 
app.post('/deleteuser', function(req, res) {
  userId = req.body.userid;
  var query = 'UPDATE _User SET AdminId = NULL, GroupId = NULL WHERE Id = ' + userId + ';'; 
  getResult(query, function(err, users) {
    if (err) throw err;
    res.redirect('/home/0');
  });
});

// add new road 
app.post('/road', function(req, res) {
  var roadname = req.body.name;
  var originLat = req.body.originLat;
  var originLng = req.body.originLng;
  var destinationLat = req.body.destinationLat;
  var destinationLng = req.body.destinationLng;
  var query = 'INSERT INTO _MarkedPlace(`UserId`, `AdminId`, `Name`, `OriginLat`, `OriginLng`, `DestinationLat`, `DestinationLng`) VALUES(' + userId + ', ' + adminId + ', "' + roadname +'", "' + originLat + '", "' + originLng + '", "' + destinationLat + '", "' + destinationLng + '");'; 
  getResult(query, function(err, users) {
    if (err) {
      res.redirect('overlook?status=0');
      throw err;
    }
    else {
      console.log(query);
      res.redirect('overlook?status=1');
    }
  });
});

app.get('/intro', function(req, res) {
  var query = 'SELECT * FROM _Admin WHERE `Id` = ' + adminId + ';';
  getResult(query, function(err, admin) {
    res.render('intro', {admin: admin[0]});          
    res.end();
  });
});

// mobile api
app.post('/:users', function(req, res) { 
  var idcode = req.body.idcode;
  var firstname = req.body.firstname;
  var lastname = req.body.lastname;
  var phonenumber = req.body.phonenumber;
  var dob = req.body.dob;
  var gender = req.body.gender;

  var user = {IdCode: idcode, Firstname: firstname, Lastname: lastname, Phonenumber: phonenumber, Dob: dob, Gender: gender};
  pool.query('INSERT INTO _User SET ?', user, function(err, result, fields) {
    if (err) {
      throw err;
      res.json({"Error": true, "Message": "Error executring MySQL query"});
    }
    else { 
      res.json({"Error": false, "Message": "User Added"});
    }
    res.end();
  });
});

app.put('/:users', function(req, res) {
  var idcode = req.body.idcode;
  var firstname = req.body.firstname;
  var lastname = req.body.lastname;
  var phonenumber = req.body.phonenumber;
  var dob = req.body.dob;
  var gender = req.body.gender;

  var user = {IdCode: idcode, Firstname: firstname, Lastname: lastname, Phonenumber: phonenumber, Dob: dob, Gender: gender};
  pool.query('UPDATE _User SET `Firstname` = "' + firstname + '", `Lastname` = "' + lastname + '", `Phonenumber` = "' + phonenumber + '", `Dob` = "' + dob + '", `Gender` = ' + gender +' WHERE `IdCode` = "' + idcode + '";', function(err, result, fields) {
    if (err) {
      throw err;
      res.json({"Error": true, "Message": "Error executring MySQL query"});
    }
    else { 
      res.json({"Error": false, "Message": "User Updated"});
    }
    res.end();
  });
});
// get marked places
app.get('/:roads', function(req, res) {
  var idcode = req.param('idcode');
  console.log('TEST IDCODE ' + idcode);
  var query = 'SELECT A.Name, A.OriginLat, A.OriginLng, A.DestinationLat, A.DestinationLng FROM _MarkedPlace A INNER JOIN _User B ON A.UserId = B.Id WHERE `IdCode` = "' + idcode + '";';
  console.log(query);
  pool.query(query, function(err, result, fields) {
    if (err) {
      throw err;
      res.json({"Error": true, "Message": "Error executring MySQL query"});
    }
    else {
      console.log(result);
      res.send({
        result: 'success', 
        err: '',
        fields: fields,
        json: result,
        length: result.length
      });
    }
    res.end();
  });
});


