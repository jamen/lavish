var Promise = require('bluebird');
var get = require('https').get;
var extractGzip = require('zlib').createGunzip;
var extractTar = require('tar-stream').extract;

// https.get Promise wrapper.
var fetch = function fetch(url) {
  return new Promise(function(resolve, reject) {
    get(url, function(source) {
      source.on('error', reject);
      resolve(source);
    });
  });
};

// Parse "source" as json.
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

// Unpack "source" as npm package.
fetch.unpack = function(source, entryHandler) {
  return new Promise(function(resolve, reject) {
    var decompress = extractGzip();
    var extract = extractTar();

    decompress.on('error', reject);
    extract.on('error', reject);
    extract.on('finish', resolve);

    source.pipe(decompress).pipe(extract);
    extract.on('entry', function(info, file, next) {
      entryHandler(info.name.slice(8), file, next);
    });
  });
};

module.exports = fetch;
