var path = require('path');
var semver = require('semver');
var fetch = require('./fetch');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var mkdirp = Promise.promisify(require('mkdirp'));

var EMPTY = JSON.stringify({versions: {}});

// Creates a manager from a bucket, name, and tag
var _getPkg = function _getPkg(bucket, name, tag, manager) {
  var versions = Object.keys(bucket.versions).sort();
  for (var i = 0, max = versions.length; i < max; i++) {
    var version = versions[i];
    if (semver.satisfies(versions[i], tag)) {
      var uuid = bucket.versions[version];
      return manager({name: name, version: version, uuid: uuid});
    }
  }
  return null;
};

// Select a manager given a name and a tag.
var select = function select(name, tag, base, manager) {
  var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  if (!tag) tag = 'local-latest';
  if (!base) base = path.join(home, '.lavish');
  if (!manager) manager = require('./manager');
  var bucketPath = path.join(base, name, 'bucket.json');

  // Read "bucket.json"
  return fs.readFileAsync(bucketPath).then(function _select(data) {
    // Bucket and versions
    var bucket = {versions: {}};
    try {
      bucket = JSON.parse(data);
    } catch (e) {}

    // Handle "local-latest"
    var versions = Object.keys(bucket.versions).sort();
    if (tag === 'local-latest') {
      if (versions.length) {
        var localLatest = versions[0];
        var localUuid = bucket.versions[localLatest];
        return manager({
          name: name,
          version: localLatest,
          uuid: localUuid
        });
      }
      tag = 'latest';
    }

    // Handle package version;
    var selectPkg = _getPkg(bucket, name, tag, manager);
    if (selectPkg) return selectPkg;

    // Request package tag.
    var pkgUrl = 'https://registry.npmjs.org/' + name + '/' + tag;
    return fetch(pkgUrl).then(function(data) {
      return fetch.json(data);
    }).then(function(pkg) {
      // Attempt to reselect package from version..
      return [_getPkg(bucket, pkg.name, pkg.version, manager), pkg];
    }).all().spread(function(manage, pkg) {
      // Create new package.
      if (!manage) manage = manager({name: pkg.name, version: pkg.version});
      return [manage, manage.info()];
    }).all().spread(function(manage, pkg) {
      bucket.versions[pkg.version] = pkg.uuid;
      var rawBucket = JSON.stringify(bucket);
      return fs.writeFileAsync(bucketPath, rawBucket).then(function() {
        return manage;
      });
    });
  }, function() {
    // Create bucket.json and try again.
    return mkdirp(path.dirname(bucketPath)).then(function() {
      return fs.writeFileAsync(bucketPath, EMPTY);
    }).then(function() {
      return select(name, tag, base);
    });
  });
};

module.exports = select;
