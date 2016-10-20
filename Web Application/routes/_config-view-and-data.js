/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Philippe Leefsma 2015 - ADN/Developer Technical Services
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
/////////////////////////////////////////////////////////////////////
var BASE_URL = 'https://developer.api.autodesk.com';
var VERSION = 'v2';

module.exports = {

  // File resumable upload chunk in MB
  fileResumableChunk: 5,

  // Default bucketKey, used for testing
  // needs to be unique so you better modify it
  defaultBucketKey: '<your bucket>',

  // Replace with your own API credentials:
  // http://developer.autodesk.com
  credentials: {
    client_id: process.env.LMV_CONSUMERKEY || '<your key>',
    client_secret: process.env.LMV_CONSUMERSECRET || '<your secret>',
    grant_type: 'client_credentials',
    scope: 'data:read data:create data:write bucket:read bucket:create'
  },


  // API EndPoints
  endPoints:{

    authenticate:     BASE_URL + '/authentication/v1/authenticate',

    //data management
    getBucket:        BASE_URL + '/oss/' + VERSION + '/buckets/%s/details',
    createBucket:     BASE_URL + '/oss/' + VERSION + '/buckets',
    listBuckets:      BASE_URL + '/oss/' + VERSION + '/buckets?%s',
    upload:           BASE_URL + '/oss/' + VERSION + '/buckets/%s/objects/%s',
    resumableUpload:  BASE_URL + '/oss/' + VERSION + '/buckets/%s/objects/%s/resumable',

    //model derivative
    translate:         BASE_URL + '/modelderivative/' + VERSION + '/designdata/job',
    manifest:         BASE_URL + '/modelderivative/' + VERSION + '/designdata/%s/manifest',
    derivatives:      BASE_URL + '/modelderivative/' + VERSION + '/designdata/%s/manifest/%s',
   }
}
