var get = require('https').get;
var Promise = require('bluebird');
var createGunzip = require('zlib').createGunzip;
var tar = require('tar-stream');

var request = function request(url) {
  return new Promise(function(resolve, reject) {
    get(url, function(resp) {
      resp.on('error', reject);
      resolve(resp);
    });
  });
};

request.json = function(resp) {
  return new Promise(function(resolve) {
    var chunks = [];
    resp.on('data', function(chunk) {
      chunks.push(chunk);
    });

    resp.on('end', function() {
      resolve(JSON.parse(Buffer.concat(chunks)));
    });
  });
};

request.unpack = function(resp) {
  return new Promise(function(resolve, reject) {
    var gunzip = createGunzip();
    var tarball = tar.extract();
    resp.on('end', resolve);
    resp.pipe(gunzip).pipe(tarball);
    resolve(tarball);
  });
};

module.exports = request;
