'use strict';

const im = require('imagemagick');
const fs = require('fs');

const aws = require('aws-sdk');

const s3 = new aws.S3({ apiVersion: '2006-03-01', signatureVersion: 'v4' });

const postProcessResource = (resource, fn) => {
    let ret = null;
    if (resource) {
        if (fn) {
            ret = fn(resource);
        }
        try {
            fs.unlinkSync(resource);
        } catch (err) {
            // Ignore
        }
    }
    return ret;
};

const convert = (req, callback) => {
    const customArgs = req.customArgs || [];
    let inputFile = null;
    let outputFile = null;
    
    getObjectFromS3(req.sourceBucket, req.imageKey).then(function(fileData) {
        console.log("Received file.");
        
        inputFile = `/tmp/inputFile.${(req.inputExtension || 'png')}`;
        fs.writeFileSync(inputFile, fileData.Body);
        customArgs.unshift(inputFile);
        
        if (req.outputExtension) {
            outputFile = `/tmp/outputFile.${req.outputExtension}`;
            customArgs.push(outputFile);
        }
        
        console.log("Starting image conversion.");
        im.convert(customArgs, (err, output) => {
            if (err) {
                console.log('Convert operation failed:', err);
                callback(err);
            } else {
                console.log('Convert operation completed successfully');
                postProcessResource(inputFile);
                if (outputFile) {
                    const outputFileName = `${req.imageKey}`.replace(/\.[^/.]+$/, "")
                    const convertedImageKey =  `converted-${outputFileName}.${req.outputExtension}`;
                    
                    uploadFile(postProcessResource(outputFile, 
                                                    (file) => new Buffer(fs.readFileSync(file))), 
                                                    process.env.UPLOAD_BUCKET, 
                                                    convertedImageKey)
                    .then(function(url) {
                        callback(null, url);
                    }, function(err) {
                        callback(err);
                    });
                } else {
                    // Return the command line output as a debugging aid
                    callback(null, output);
                }
            }
        });
    }, function(err) {
        callback(err);
    });
};

const getObjectFromS3 = (bucket, key) => {
    var params = {
        Bucket: bucket,
        Key: key
    };
    
    var promise = new Promise(function(resolve, reject) {
        s3.getObject(params, function(err, data) {
           if (err) {
               reject(err);
           } 
           else {
               resolve(data);
           }
        });
    });
    
    return promise;
};

const uploadFile = (base64Data, bucket, key, callback) => {
  var params = {
      Bucket: bucket,
      Key: key,
      Body: base64Data
  };
  
  var promise = new Promise(function(resolve, reject) {
      s3.putObject(params, function(err, data) {
      if (err) {
          console.log(err, err.stack);
          reject(err);
      }
      else {    
          console.log(data);
          resolve("s3://" + params.Bucket + "/" + params.Key);
      }
    });
  });
  
  return promise;
};

exports.handler = (event, context, callback) => {
    const req = event;
    const operation = req.operation;
    const sourceBucket = req.sourceBucket;
    const imageKey = req.imageKey;
    delete req.operation;
    if (operation) {
        console.log(`Operation ${operation} requested on ${sourceBucket}/${imageKey}`);
    }

    switch (operation) {
        case 'ping':
            callback(null, 'pong');
            break;
        case 'convert':
            convert(req, callback);
            break;
        default:
            callback(new Error(`Unrecognized operation "${operation}"`));
    }
};
