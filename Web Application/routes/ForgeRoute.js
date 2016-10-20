var express =require ('express') ;
var bodyParser =require ('body-parser') ;
var formidable = require('formidable')
var fs =require ('fs') ;
var async =require ('async') ;
var router =express.Router () ;
router.use (bodyParser.json ()) ;

var lmv =require ('./lmv.js') ;


var uploadFileFolder = 'upload_model';

router.get ('/gettoken', function (req, res) {
    var returnV = lmv.Lmv.getToken();
    if(returnV.validtoken != 'undefined') {
        res.send({access_token:returnV});
    }
});

router.post ('/file', function (req, res) {

    var filename ='' ;

    var form =new formidable.IncomingForm () ;
    form.uploadDir =uploadFileFolder ;
    form
        .on ('field', function (field, value) {
            console.log (field, value) ;
        })
        .on ('file', function (field, file) {
            //console.log (field, file) ;
            fs.rename (file.path, form.uploadDir + '/' + file.name) ;
            filename =file.name ;

        })
        .on ('end', function () {
            console.log ('-> upload done') ;
            if ( filename == '' )
                res.status (500).end ('No file submitted!') ;
            res.json ({ 'name': filename }) ;
        })
    ;
    form.parse(req);
}) ;


router.post ('/translate', function (req, res) {
    var filename = req.body.name ;
    var iszip = req.body.iszip;
    var mainfile = req.body.rootfile;


    async.waterfall ([
        function (callbacks1) {
            console.log ('Trying to Create Bucket') ;
            new lmv.Lmv ().createBucket ()
                .on ('success', function (data) {
                    console.log ('Bucket is created or now exists!') ;
                    callbacks1 (null, data) ;
                })
                .on ('fail', function (err) {
                    console.log ('Failed to create bucket!') ;
                    callbacks1 (err) ;
                })
            ;
        },
        function (arg1, callbacks2) {
            console.log ('started to async upload') ;
            new lmv.Lmv ().uploadFile (filename)
                .on ('success', function (data) {
                    console.log (filename + ' is uploaded.') ;
                    callbacks2 (null, data) ;
                })
                .on ('fail', function (err) {
                    console.log ('Failed to upload ' + filename + '!') ;
                    callbacks2 (err) ;
                })
            ;
        },
        function (arg1, callbacks3) {
            console.log ('Launching translation') ;
            var urn =JSON.parse (arg1).objectId ;
            new lmv.Lmv ().translate (urn,iszip,mainfile)
                .on ('success', function (data) {
                    console.log ('Translation requested.') ;
                    callbacks3 (null, data) ;
                })
                .on ('fail', function (err) {
                    console.log ('Failed to request translation!') ;
                    callbacks3 (err) ;
                })
            ;
        }

    ], function (err, results) {
        if ( err != null ) {
            if ( err.hasOwnProperty ('statusCode') && err.statusCode != 200 )
                return (res.status (err.statusCode).send (err.body.reason)) ;
            if ( !err.raw_body.hasOwnProperty ('key') )
                return (res.status (500).send ('The server did not return a valid key')) ;
            return (res.status (500).send ('An unknown error occurred!')) ;
        }

        res.json (results) ;
    }) ;

}) ;

router.get ('/translate/:urn/progress', function (req, res) {
    var urn =req.params.urn ;
    new lmv.Lmv ().status (urn)
        .on ('success', function (data) {
            console.log (data.progress) ;
            res.json (data) ;
        })
        .on ('fail', function (err) {
            res.status (404).end () ;
        })
    ;
}) ;
module.exports =router ;