var Promise = require('bluebird');
var extract = require('tar-stream').extract;
var gunzip = require('zlib').createGunzip;

module.exports = function unpack(file, entry) {
  return new Promise(function(resolve, reject) {
    var decompress = gunzip();
    var parse = extract();

    file.on('error', reject);
    decompress.on('error', reject);
    parse.on('error', reject);
    parse.on('entry', entry);
    parse.on('finish', resolve);

    file.pipe(decompress).pipe(parse);
  });
};
