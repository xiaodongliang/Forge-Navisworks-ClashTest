//
// Copyright (c) Autodesk, Inc. All rights reserved
//
// Node.js server workflow
// by Cyrille Fauvel - Autodesk Developer Network (ADN)
// January 2015
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
//
var express =require ('express') ;
var request =require ('request') ;
var unirest =require('unirest') ;
var events =require('events') ;
var util =require ('util') ;
var path =require ('path') ;
var fs =require ('fs') ;

var config = require('./config-view-and-data.js');

// LMV object
function Lmv () {

     events.EventEmitter.call (this) ;
}

util.inherits (Lmv, events.EventEmitter) ;

Lmv.getToken =function () {
    try {
        var data =fs.readFileSync ('data/token.json') ;
        var authResponse =JSON.parse (data) ;

       return  authResponse.access_token;
    } catch ( err ) {
        console.log (err) ;
    }
    return ('') ;
} ;

Lmv.refreshToken =function () {
    console.log ('Refreshing Autodesk Service token') ;

    var self =this ;
    unirest.post (config.endPoints.authenticate)
        .header ('Accept', 'application/json')
        .send (config.credentials)
        .end (function (response) {
            try {
                if ( response.statusCode != 200 )
                    throw response ;
                var authResponse =response.body ;
                self.token  = authResponse.access_token;
                console.log ('Token: ' + JSON.stringify (authResponse)) ;
                fs.writeFile ('data/token.json', JSON.stringify (authResponse), function (err) {
                    if ( err )
                        throw err ;
                }) ;
            } catch ( err ) {
                if(fs.existsSync ('data/token.json'))
                   fs.unlinkSync ('data/token.json') ;
                console.log ('Token: ERROR! (' + response.statusCode + ')') ;
            }
        }) ;
} ;

Lmv.prototype.createBucket =function () {

    var self =this ;
    unirest.post (config.endPoints.createBucket)
        .header ('Accept', 'application/json')
        .header ('Content-Type', 'application/json')
        .header ('Authorization', 'Bearer ' + Lmv.getToken ())
        .send ({ 'bucketKey': config.defaultBucketKey, 'policyKey': 'transient' })
        .end (function (response) {
            try {
                if ( response.statusCode != 200 &&
                    response.statusCode != 409  )
                    throw response ;
                self.emit ('success', config.defaultBucketKey) ;
            } catch ( err ) {
                self.emit ('fail', err) ;
            }
        })
    ;
    return (this) ;
} ;


Lmv.prototype.uploadFile =function (filename) {
    var self =this ;
    var serverFile =path.normalize (__dirname + '/../' + 'upload_model/' + filename) ;

    var file =fs.readFile (serverFile, function (err, data) {
        if ( err )
            return (self.emit ('fail', err)) ;
        var uploadUrl = util.format(
            config.endPoints.upload,
            config.defaultBucketKey, filename.replace (/ /g, '+'));

         unirest.put (uploadUrl)
            .headers ({
                'Accept': 'application/json',
                'Content-Type': 'application/octet-stream',
                'Authorization': ('Bearer ' + Lmv.getToken ())
            })
            .send (data)
            .end (function (response) {
                try {
                    if ( response.statusCode != 200 )
                        throw response ;
                    try {
                        self.emit ('success', response.raw_body) ;
                    } catch ( err ) {
                    }
                } catch ( err ) {
                    self.emit ('fail', err) ;
                }
            })
        ;
    }) ;
    return (this) ;
} ;

Lmv.prototype.translate =function (urn,iszip,rootfile) {
    var self =this ;

    //default is to export a single file to svf
    var desc ={
        "input": {
            // urn of zip file
            "urn": new Buffer (urn).toString ('base64')
        },
        "output": {
            "formats": [
                {
                    "type": "svf",
                    "views": [
                        "3d"
                    ]
                }
            ]
        }
    };

    if(iszip)
    {
        //if it is a composite file
        desc.input['compressedUrn'] = true;
        //which one is the root file
        desc.input['rootFilename'] = rootfile;
    }

    console.log(desc);

    unirest.post (config.endPoints.translate)
        .headers ({
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': ('Bearer ' + Lmv.getToken ()),
            'x-ads-force': true
        })
        .send (desc)
        .end (function (response) {
            try {
                if ( response.statusCode != 200 && response.statusCode != 201 )
                    throw response ;
                try {
                    self.emit ('success', { 'urn': desc.input.urn, 'response': response.body }) ;
                } catch ( err ) {
                }
            } catch ( err ) {
                self.emit ('fail', err) ;
            }
        })
    ;
    return (this) ;
} ;

Lmv.prototype.status =function (urn, params) {
    var self =this ;

    var statusUrl = util.format(
        config.endPoints.manifest,urn );

    params =params || {} ;

    unirest.get (statusUrl)
        .headers ({
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': ('Bearer ' + Lmv.getToken ())
        })
        .query (params)
        .end (function (response) {
            try {
                if ( response.statusCode != 200 )
                    throw response ;
                try {
                    self.emit ('success', response.body) ;
                } catch ( err ) {
                }
            } catch ( err ) {
                self.emit ('fail', err) ;
            }
        })
    ;
    return (this) ;
} ;

var router =express.Router () ;
router.Lmv =Lmv ;
module.exports =router ;

// Utility
if ( !Number.isInteger ) {
    Number.isInteger =function isInteger (nVal) {
        return (
            typeof nVal === 'number'
            && isFinite (nVal)
            && nVal > -9007199254740992
            && nVal < 9007199254740992
            && Math.floor (nVal) === nVal
        ) ;
    } ;
}

// Initialization
function initializeApp () {
    var seconds =1700 ; // Service returns 1799 seconds bearer token
    setInterval (Lmv.refreshToken, seconds * 1000) ;
    Lmv.refreshToken () ; // and now!
}

initializeApp () ;