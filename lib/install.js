var Bucket = require('./bucket');
var Promise = require('bluebird');
var fs = require('fs');
var readFile = Promise.promisify(fs.readFile);
var path = require('path');

module.exports = function install(ids, dir, _buckets) {
  var installs = {};
  ids.forEach(function(id) {
    var parts = id.split('@');
    var name = parts[0];
    var tag = parts[1] || 'latest-local';
    if (!installs[name]) installs[name] = [];
    installs[name].push(tag);
  });

  var proc = [];
  var buckets = _buckets || {};
  var installNames = Object.keys(installs);
  for (var i = 0, max = installNames.length; i < max; i++) {
    var installName = installNames[i];
    var versions = installs[installName];

    var bucket = buckets[installName] = new Bucket({name: installName});
    proc.push(bucket.install(versions, dir).map(function(pkg) {
      return Promise.all([
        readFile(path.join(pkg.location, 'package.json')),
        pkg
      ]);
    }).each(function(res) {
      var raw = res[0];
      var pkg = res[1];
      var pkgJson = JSON.parse(raw);
      if (pkgJson.dependencies) {
        var depInstalls = [];
        var deps = pkgJson.dependencies;
        var depNames = Object.keys(deps);
        for (var i = 0, max = depNames.length; i < max; i++) {
          var depName = depNames[i];
          depInstalls.push(depName + '@' + deps[depName]);
        }
        return install(depInstalls, pkg.location, buckets);
      }
    }));
  }

  return Promise.all(proc);
};
