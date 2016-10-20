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
//var defaultUrn = 'urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6eGlhb2Rvbmd0ZXN0YnVja2V0L0Zyb250TG9hZGVyLm53ZA==';
var defaultUrn = 'urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YWRuLWJ1Y2tldC0xL0NsYXNoVGVzdC5ud2Q';

var viewerApp;


$(document).ready(function () {

    // Allows different urn to be passed as url parameter
    var paramUrn = Autodesk.Viewing.Private.getParameterByName('urn');
    var urn = (paramUrn !== '' ? paramUrn : defaultUrn);

      var xhr = new XMLHttpRequest();
      xhr.open("GET", 'http://' + window.location.host + '/ForgeRoute/gettoken', false);
      xhr.send(null);
    var json = eval('(' + xhr.responseText + ')');
    var token =  json.access_token;

    var options = {
        env: 'AutodeskProduction',
        accessToken: token
    };
    Autodesk.Viewing.Initializer(options, function onInitialized(){

        var config3d = {
            extensions: ['MyUIExtension']
        };
        viewerApp = new Autodesk.A360ViewingApplication('viewerDiv');
        viewerApp.registerViewer(viewerApp.k3D, Autodesk.Viewing.Private.GuiViewer3D,config3d);
        viewerApp.loadDocumentWithItemAndObject(urn);
    });
});

function onError(error) {
    console.log('Error: ' + error);
};
