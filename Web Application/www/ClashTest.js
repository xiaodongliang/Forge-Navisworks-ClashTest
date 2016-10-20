function ClashTestExtension(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}

ClashTestExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
ClashTestExtension.prototype.constructor = ClashTestExtension;

ClashTestExtension.prototype.onShowPanel = function() {
    this._panel.setVisible(this._OnOff);
    this._OnOff = !this._OnOff;
}

ClashTestExtension.prototype.load = function() {

    console.log('ClashTestExtension.load');
    _viewer = this.viewer;
    this._panel = new Panel(this.viewer,newGUID());
    this._OnOff = true;
    this.onShowPanel();
    this._panel.refreshClash();
    return true;
};

ClashTestExtension.prototype.unload = function() {
    this._panel = null;
    return true;
};
Autodesk.Viewing.theExtensionManager.registerExtension('ClashTestExtension', ClashTestExtension);

function newGUID() {

    var d = new Date().getTime();

    var guid = 'xxxx-xxxx-xxxx-xxxx-xxxx'.replace(
        /[xy]/g,
        function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
        });

    return guid;
}



Panel = function (theVewer,baseId) {

    this.content = document.createElement('div');

    this.content.id = baseId + 'PanelContentId';
    this.content.className = 'uicomponent-panel-content';

    Autodesk.Viewing.UI.DockingPanel.call(this, theVewer.container, baseId, 'Clash Test',{shadow: true});


    this.container.style.right = "0px";
    this.container.style.top = "0px";

    this.container.style.width = "380px";
    this.container.style.height = "500px";

    this.container.style.resize = "auto";


    var _viewer =  theVewer;
    var _clashTestJsonObj = null;
    var _currentClashTest =null;
    var c  = null;

    var _overrideFragIds = {};
    var _overlayRed = "RedOverlay";
    var _overlayBlue = "BlueOverlay";

    // create Color overlay for Red and assign to all even objects
    var matRed = new THREE.MeshBasicMaterial({ color: 'red' });
    _viewer.impl.createOverlayScene(_overlayRed, matRed);
    // create Color overlay for Glue and assign to all odd objects
    var matBlue= new THREE.MeshBasicMaterial({ color: 'blue' });
    _viewer.impl.createOverlayScene(_overlayBlue, matBlue);

    //produce the layout of the panel
    var html = [
        '<div class="uicomponent-panel-container">',

            '<div class="panel-heading">',
            '<h3 class="panel-title">Clash Tests</h3>',
            '</div>',
            '<select name="clashtest" id="clashtest_select" class="form-control" >',
                '<option></option>',
            '</select>',
        '<Seperator>',
        '<div class="uicomponent-panel-controls-container">',
            '<div class="panel panel-default">',
                 '<div class="panel-heading">',
                    '<h3 class="panel-title">Clash Results</h3>',
                 '</div>',
            '<table class="table table-hover table-responsive" id = "clashresultstable">',
                '<thead>',
                    '<th>Name</th><th>Status</th><th>Found</th><th>Approved By</th><th>Description</th>',
                '</thead>',
            '</table>',
           '</div>',
        '<button  id="refresh_clash" class="btn btn-primary">Refresh Clash Test</button>',
        '<span>',
        '<button  id="restore_overlay" class="btn btn-primary">Restore Overlay</button>',
        '</div>',
     '</div>'
    ].join('\n');

    $('#' + baseId + 'PanelContentId').html(html);


    $("#refresh_clash").click(function () {

        this.refreshClash();
    });

    this.refreshClash = function()
    {
        //get latest clash results from server

        $.ajax ({
            url: 'http://' + window.location.host +'/ClashTestRoute/getNewClash',
            type: 'get',
            data: null,
            complete: null
        }).done (function (response) {
            if ( response) {
                _clashTestJsonObj = eval ('('  + response + ')');
                //render the layout of clash view
                produceNew(_clashTestJsonObj);
            } else {
            }
        }).fail (function (xhr, ajaxOptions, thrownError) {

        }) ;
    }

    function produceNew(jsonObj)
    {
        //clean select box of clash tests
        $("#clashtest_select option").remove();
        //clean table of clash result
        $("#clashresultstable tbody").remove();

        //add test one by one
        for(var index in jsonObj)
        {
            $("#clashtest_select").append('<option>' + jsonObj[index].DisplayName + '</option>');
        }
    }

    $('#clashtest_select').change(function() {

        //when a clash result is selected.
        restoreOverrideColor();

        console.log('selected test:' + $(this).val());
        var selectedTestName = $(this).val();
        _currentClashTest = selectedTestName;

        //found the clash test
        var found = getClashTestByName(selectedTestName);

        $("#clashresultstable tbody").remove();
        $("#clashresultstable").append('<tbody></tbody>');

        //the test should be unique
        //so assume only one clash test is available
        if(found.length >0) {
            //add clash result one by one
            for (var index in found[0].ClashResults) {
                var eachResult = found[0].ClashResults[index];

                $("#clashresultstable tbody").append('<tr id="'+ index +'">' +
                    '<td>' + eachResult.DisplayName + '</td>' +
                    '<td>' + eachResult.Status + '</td>' +
                    '<td>' + eachResult.Found + '</td>' +
                    '<td>' + eachResult.ApprovedBy + '</td>' +
                    '<td>' + eachResult.Description + '</td></tr>');
            }
        }

        $('#clashresultstable tr').click(function (event) {

            //when a clash result is selected
            console.log('selected result index:' + $(this).attr('id'));
            var resultindex = parseInt($(this).attr('id'));

            var found = getClashTestByName(_currentClashTest);

            //find the clash object1 and object2
            if(found.length>0){
                var selectedResult = found[0].ClashResults[resultindex];
                _currentResult = selectedResult;

                var objDbIdArray = [];
                _viewer.search(selectedResult.path1ID, function (idArray) {
                    if(idArray.length>0){
                        objDbIdArray.push(idArray[0]);

                        _viewer.search(selectedResult.path2ID, function (idArray) {
                            if(idArray.length>0){
                                objDbIdArray.push(idArray[0]);

                                restoreOverrideColor();

                                var objTree =   _viewer.model.visibilityManager.getInstanceTree();
                                var frags = [];
                                //find the fragment of the object1
                                objTree.enumNodeFragments(objDbIdArray[0], function(fragId) {
                                    frags.push(fragId);
                                });
                                //make the object with red color
                                overrideColorOnFragments(frags, _overlayRed);

                                frags = [];
                                //find the fragment of the object2
                                objTree.enumNodeFragments(objDbIdArray[1], function(fragId) {
                                    frags.push(fragId);
                                });
                                //make the object with blue color
                                overrideColorOnFragments(frags, _overlayBlue);

                                //isolate object1 and object2
                                _viewer.showAll();
                                _viewer.model.visibilityManager.isolateMultiple(objDbIdArray);

                                //focus on the viewpoint of clash objects

                                //if we get the value  by COM API of Navisworks. Then the suitable viewpoint is available.
                                //_viewer.navigation.setWorldUpVector(
                                //            new THREE.Vector3(_currentResult.viewpoint.UpVec[0],
                                //                             _currentResult.viewpoint.UpVec[1],
                                //                             _currentResult.viewpoint.UpVec[2]));

                                // var newPos = new THREE.Vector3( _currentResult.viewpoint.Position[0],
                                //                                  _currentResult.viewpoint.Position[1],
                                //                                  _currentResult.viewpoint.Position[2]);
                                //var newTarget = new THREE.Vector3(_currentResult.viewpoint.Target[0],
                                //                                   _currentResult.viewpoint.Target[1],
                                //                                   _currentResult.viewpoint.Target[2]);


                                 var newPos = new THREE.Vector3( _currentResult.SuitablePosition[0],
                                                                  _currentResult.SuitablePosition[1],
                                                                  _currentResult.SuitablePosition[2]);
                                var newTarget = new THREE.Vector3(_currentResult.CenterPt[0],
                                                                   _currentResult.CenterPt[1],
                                                                   _currentResult.CenterPt[2]);

                                _viewer.navigation.setView(newPos, newTarget);

                                _viewer.fitToView(true);
                            }
                            else
                            {
                                console.warn('no object for path2 !');
                            }
                        });
                    }
                    else
                    {
                        console.warn('no object for path1 !');
                    }
                });

            }
            else {
                console.warn('no such clash: ' + _currentClashTest);
            }
        });
    });

    function overrideColorOnFragments(fragIds, overlayName) {
        for (j=0; j<fragIds.length; j++) {
            var mesh = _viewer.impl.getRenderProxy(_viewer.impl.model, fragIds[j]);

            var myProxy = new THREE.Mesh(mesh.geometry, mesh.material);
            myProxy.matrix.copy(mesh.matrixWorld);
            myProxy.matrixAutoUpdate = false;
            myProxy.matrixWorldNeedsUpdate = true;
            myProxy.frustumCulled = false;
            _viewer.impl.addOverlay(overlayName, myProxy);
            // keep track of the frags so that we can remove later
            _overrideFragIds[fragIds[j]] = myProxy;
        }
    }

    function restoreOverrideColor ()
    {
        for (var p in _overrideFragIds) {
            var mesh = _overrideFragIds[p];
            if (mesh) {
                _viewer.impl.removeOverlay(_overlayRed, mesh);
                _viewer.impl.removeOverlay(_overlayBlue, mesh);
            }
        }
        // reset the fragIds array
        _overrideFragIds = {};
        _viewer.showAll();

    }

    function getClashTestByName(name) {
        return _clashTestJsonObj.filter(
            function(data){ return data.DisplayName == name }
        );
    }

}

Panel.prototype = Object.create(Autodesk.Viewing.UI.DockingPanel.prototype);
Panel.prototype.constructor = Panel;
Panel.prototype.initialize = function () {

    this.title = this.createTitleBar(
        this.titleLabel ||
        this.container.id);

    this.closer = this.createCloseButton();

    this.container.appendChild(this.title);
    this.title.appendChild(this.closer);
    this.container.appendChild(this.content);

    this.initializeMoveHandlers(this.title);
    this.initializeCloseHandler(this.closer);
};


function isCssLoaded(name) {

    for (var i = 0; i < document.styleSheets.length; ++i) {

        var styleSheet = document.styleSheets[i];

        if (styleSheet.href && styleSheet.href.indexOf(name) > -1)
            return true;
    };
    return false;
}
// loads bootstrap css if needed
if (!isCssLoaded("bootstrap.css") && !isCssLoaded("bootstrap.min.css")) {

    $('<link rel="stylesheet" type="text/css" href="http://netdna.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.css"/>').appendTo('head');
}

