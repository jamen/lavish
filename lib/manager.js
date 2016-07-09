var fs = require('fs');
var Promise = require('bluebird');
var writeFile = Promise.promisify(fs.writeFile);
var readFile = Promise.promisify(fs.readFile);
var symlink = Promise.promisify(fs.symlink);
var mkdirp = Promise.promisify(require('mkdirp'));
var path = require('path');
var semver = require('semver');
var fetch = require('./fetch');
var uuid = require('uuid');
var noop = function noop() {};

var ERR_PACKAGE = new Error('Package does not exist.');

var manager = function manager(name, location) {
  location = location || path.join(process.env.HOME, '.lavish/packages', name);
  var jsonFile = path.join(location, 'bucket.json');
  var bucket = {versions: {}, git: {}};
  var apiUrl = 'https://registry.npmjs.org/' + name + '/';

  var _ = {
    // Select package UUID from the bucket.
    select: function select(tag) {
      if (!tag) return null;

      // Handle "git:" tags.
      // if (tag.slice(0, 4) === 'git:') return bucket.git[tag.slice(4)];

      // Handle "latest-local" tags.
      if (tag === 'latest-local' && _.versions().length) return _.latestLocal();

      // Handle semver tags.
      return _.versions(tag);
    },

    latestLocal: function() {
      var all = _.versions();
      return _.versions(all[all.length - 1]);
    },

    // Get all versions, or select one with a semver tag.
    versions: function versions(tag) {
      var versions = Object.keys(bucket.versions).sort();
      if (!tag) return versions;
      for (var i = versions.length; i--;) {
        if (semver.satisfies(versions[i], tag)) {
          return bucket.versions[versions[i]];
        }
      }
      return null;
    },

    // Download tarball off npm.
    download: function download(tag) {
      var pkgUUID = uuid();
      var pkgUrl = apiUrl + tag;

      return fetch(pkgUrl).then(function(raw) {
        return fetch.json(raw);
      }).then(function(body) {
        if (!Object.keys(body).length) return Promise.reject(ERR_PACKAGE);
        var version = body.version;
        var tarballUrl = apiUrl + '-/' + name + '-' + version + '.tgz';

        return fetch(tarballUrl).then(function(tarball) {
          return fetch.unpack(tarball, function(name, file) {
            var filePath = path.join(location, pkgUUID, name);
            mkdirp(path.dirname(filePath)).then(function() {
              var write = fs.createWriteStream(filePath);
              file.pipe(write);
            });
          });
        }).then(function(tarball) {
          bucket.versions[version] = pkgUUID;
          return _.save();
        });
      });
    },

    // Create a symlink.
    link: function link(tag, local) {
      var pkgLocation = _.location(tag);
      return mkdirp(path.dirname(local)).then(function() {
        return symlink(pkgLocation, local).catch(noop);
      });
    },

    install: function(tag, local) {
      var dest = path.join(local, 'node_modules', name);
      if (_.select(tag)) return _.link(tag, dest).then(function() {
        return false;
      });
      if (tag === 'latest-local') tag = 'latest';
      return _.download(tag).then(function() {
        return _.info(tag === 'latest' ? 'latest-local' : tag);
      }).then(function(info) {
        return _.link(info.version, dest);
      }).then(function() {
        return true;
      });
    },

    info: function info(tag) {
      var pkgInfoLocation = path.join(_.location(tag), 'package.json');
      return readFile(pkgInfoLocation).then(function(raw) {
        return JSON.parse(raw);
      });
    },

    // Clone repository.
    // clone: function clone(repo) {},

    // Save the manager's bucket.
    save: function save() {
      return mkdirp(location).then(function() {
        return writeFile(jsonFile, JSON.stringify(bucket, null, 2));
      });
    },

    // Load the saved bucket.
    load: function load() {
      return readFile(jsonFile).then(function(raw) {
        bucket = JSON.parse(raw);
      }, function() {
        return _.save().then(function() {
          return load();
        });
      });
    },

    location: function _location(tag) {
      return path.join(location, _.select(tag));
    }
  };

  return _;
};

module.exports = manager;
