var Promise = require('bluebird');
var get = require('https').get;
var extractGzip = require('zlib').createGunzip;
var extractTar = require('tar-stream').extract;

var fetch = function fetch(url) {
  return new Promise(function(resolve, reject) {
    get(url, function(resp) {
      resp.on('error', reject);
      resolve(resp);
    });
  });
};

fetch.json = function(source) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    source.on('data', function(chunk) {
      chunks.push(chunk);
    });
    source.on('end', function() {
      resolve(JSON.parse(Buffer.concat(chunks)));
    });
  });
};

fetch.unpack = function(source, entryHandler) {
  return new Promise(function(resolve, reject) {
    var decompress = extractGzip();
    var extract = extractTar();

    decompress.on('error', reject);
    extract.on('error', reject);
    source.on('end', resolve);

    source.pipe(decompress).pipe(extract);
    extract.on('entry', function(info, file, next) {
      file.on('end', next);
      entryHandler(info.name.slice(8), file);
    });
  });
};

module.exports = fetch;
