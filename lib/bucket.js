var assign = require('object-assign');
var path = require('path');
var Promise = require('bluebird');
var Package = require('./package');
var fs = require('fs');
var semver = require('semver');
var mkdirp = require('mkdirp');
var request = require('./request');

var ERR_NAME = new Error('Invalid bucket name.');
var ERR_TAG = new Error('Invalid tag');
var BASE = path.join(process.env.HOME, '.lavish/packages');

var Bucket = module.exports = function Bucket(options) {
  assign(this, options);

  if (!this.location) this.location = path.join(BASE, this.name);
  if (!this._jsonFile) this._jsonFile = path.join(this.location, 'bucket.json');

  this._validate();
};

Bucket.prototype = {
  constructor: Bucket,

  init: function init() {
    return this.save({versions: {}, git: {}});
  },

  refresh: function refresh() {
    var _this = this;
    return new Promise(function(resolve, reject) {
      fs.readFile(_this._jsonFile, function(err, data) {
        if (err && err.code === 'ENOENT') return _this.init().then(function() {
          return _this.refresh().then(resolve, reject);
        }, reject);
        if (err) return reject(err);
        _this.map = JSON.parse(data);
        resolve(_this.map);
      });
    });
  },

  save: function(map) {
    map = map || this.map;
    var _this = this;
    return new Promise(function(resolve, reject) {
      mkdirp(path.dirname(_this._jsonFile), function(err) {
        if (err) return reject(err);
        fs.writeFile(_this._jsonFile, JSON.stringify(map), function(err) {
          if (err) return reject(err);
          _this.refresh().then(resolve, reject);
        });
      });
    });
  },

  select: function(tag) {
    var _this = this;
    return this.refresh().then(function(map) {
      if (tag.slice(0, 3) === 'git') return map.get[tag.slice(3)];
      return new Promise(function(resolve, reject) {
        var versions = Object.keys(_this.map.versions).sort();

        var getPkg = function getPkg(pkgJsonPath, uuid, call) {
          mkdirp(path.dirname(pkgJsonPath), function(err) {
            if (err) return reject(err);
            fs.readFile(pkgJsonPath, function(err, data) {
              if (err) return call(null);
              var pkgJson = JSON.parse(data);
              call(new Package({
                name: pkgJson.name,
                version: pkgJson.version,
                uuid: uuid
              }));
            });
          });
        };

        var success = false;
        for (var i = versions.length; i--;) {
          var version = versions[i];
          if (semver.satisfies(version, tag)) {
            var _uuid = map.versions[version];
            var pkgJsonPath = path.join(_this.location, _uuid, 'package.json');
            getPkg(pkgJsonPath, _uuid, resolve);
            success = true;
          }
        }
        if (!success) resolve(null);
      });
    });
  },

  install: function(tags, dir) {
    var _this = this;
    return this.refresh().then(function(map) {
      return Promise.all(tags.map(function(item) {
        if (item === 'latest-local' && Object.keys(_this.map.versions).length) {
          var versions = Object.keys(_this.map.versions).sort();
          console.log(versions[versions.length - 1]);
          return _this.select(versions[versions.length - 1]);
        } else if (semver.valid(item) && _this.map.versions[item]) {
          console.log(item);
          return _this.select(item);
        }

        var url = 'https://registry.npmjs.org/' + _this.name + '/' + item;
        return request(url).then(function(resp) {
          return request.json(resp);
        }).then(function(body) {
          if (!body) return Promise.reject(ERR_TAG);
          return _this.select(body.version).then(function(pkg) {
            if (pkg) return pkg;

            var newPkg = new Package({
              name: _this.name,
              version: body.version
            });

            var self = function() {
              return newPkg;
            };

            _this.map.versions[body.version] = newPkg.uuid;
            return _this.save().then(function() {
              return newPkg.download();
            }).then(self);
          });
        });
      }));
    }).then(function(pkgs) {
      return Promise.all(pkgs.map(function(pkg, i) {
        if (pkg) {
          var modPath = path.join(dir, 'node_modules', pkg.name);
          return pkg.link(modPath).then(function() {
            return pkg;
          }, function() {
            return pkg;
          });
        }
        return null;
      }));
    });
  },

  _validate: function _validate() {
    if (!this.name) throw ERR_NAME;
  }
};
