var Promise = require('bluebird');
var httpsGet = require('https').get;

// Simple promise-based request
var request = module.exports = function request(opts) {
  return new Promise(function(resolve, reject) {
    var req = httpsGet(opts, resolve);
    req.once('error', reject);
    req.end();
  });
};

// Parse request as JSON.
request.json = function(stream) {
  return new Promise(function(resolve, reject) {
    stream.on('error', reject);

    var collect = [];
    stream.on('data', function(data) {
      collect.push(data);
    });

    stream.on('end', function() {
      try {
        resolve(JSON.parse(Buffer.concat(collect)));
      } catch (err) {
        reject(err);
      }
    });
  });
};
