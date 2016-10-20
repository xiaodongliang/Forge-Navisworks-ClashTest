/////////////////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Philippe Leefsma 2014 - ADN/Developer Technical Services
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////////////////
var favicon = require('serve-favicon');
var ForgeRoute = require('./routes/ForgeRoute');
var ClashTestRoute = require('./routes/ClashTestRoute');

var express = require('express');
var app = express();
var server = require('http').Server(app);


app.use('/', express.static(__dirname+ '/www') );
app.use(favicon(__dirname + '/www/images/favicon.ico'));
app.use('/ForgeRoute', ForgeRoute);
app.use('/ClashTestRoute', ClashTestRoute);


app.set('port', process.env.PORT || 3001);

app.get('/clashtest', function (req, res) {
    res.sendfile(__dirname + '/www/clashtest.html');
});

server.listen(app.get('port'), function() {
    console.log('Server listening on port ' + server.address().port);
});

var io = require('socket.io')(server);

io.on('connection', function(socket){
    socket.on('xiaodongclashtest', function(msg){
        console.log('message: ' + msg.user +' ' + msg.newv);
        var recievedV = msg;
        io.emit('xiaodong.liang@autodesk.com', {'clashupdated':true});
    });
    console.log('connected');
});

