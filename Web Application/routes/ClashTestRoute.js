var express =require ('express') ;
var bodyParser =require ('body-parser') ;

var fs =require ('fs') ;
var async =require ('async') ;
var router =express.Router () ;
router.use (bodyParser.json ()) ;

var _currentClash = null;

var multer = require('multer');

var clashtestfolder = './data/';

function ini()
{
    fs.readFile(clashtestfolder + '/' + 'clashtestresult.json', function(err, blob){
        if (err) {
            console.log('   Faile to Read Out ClashTestResult.json: ' + err);

        } else {
            console.log('   Succeeded to Read Out ClashTestResult.json: ' + err);
            _currentClash = blob;
        }
    });
}
ini();

var done = false;
router.use(multer({
    dest: clashtestfolder,
    rename: function (fieldname, filename) {
        console.log()
        return filename;
    },
    onFileUploadStart: function (file) {
        console.log('onFileUploadStart');
        done = false;
    },
    onFileUploadComplete: function (file) {
        console.log('onFileUploadComplete');

        fs.readFile(clashtestfolder + '/' + file.name, function(err, blob){
            if (err) {
                console.log('   Faile to Read Out ClashTestResult.json: ' + err);

            } else {
                console.log('   Succeeded to Read Out ClashTestResult.json: ' + err);
                _currentClash = blob;
            }
        });

        done = true;
    }
}));

router.post('/postNewClash', function (req, res) {
    if (done) {
        console.log('done uploading');
        done = false;
        res.end('ok');
    }
});

router.get('/downloadNewClash', function (req, res) {
    console.log('get new clash: ' + __dirname );
    res.download(clashtestfolder  + '/clashtestresult.json' );
}) ;

router.get('/getNewClash', function (req, res) {
    console.log('get new clash: ' + __dirname );

    res.end(_currentClash);
}) ;





module.exports =router ;