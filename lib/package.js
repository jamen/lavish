var assign = require('object-assign');
var uuid = require('uuid');
var validate = require('validate-npm-package-name');
var semver = require('semver');
var Promise = require('bluebird');
var request = require('./request');
var path = require('path');
var mkdirp = require('mkdirp');
var clone = require('git-clone');
var fs = require('fs');

var ERR_NAME = new Error('Invalid package name.');
var ERR_TYPE = new Error('Invalid package type.');
var ERR_VERSION = new Error('Invalid package version.');
var ERR_GIT = new Error('Invalid git path.');
var BASE = path.join(process.env.HOME, '.lavish/packages');

var Package = module.exports = function Package(options) {
  assign(this, options);

  // Default properties.
  if (!this.type) this.type = 'npm';
  if (!this.uuid) this.uuid = uuid();
  if (!this._tarball && this.type === 'npm') {
    var endpoint = this.name + '/-/' + this.name + '-' + this.version + '.tgz';
    this._tarball = 'https://registry.npmjs.org/' + endpoint;
  }
  if (!this.location) this.location = path.join(BASE, this.name, this.uuid);

  this._validate();
};

Package.prototype = {
  constructor: Package,

  /*! Download the package, based on the "type", to "location".  Using "force"
    * overwrites any folder already present.
    * - With "type" being npm it will download using "_tarball" + https.get.
    * - With "type" being git it will clone using "git".
    * - Name of the folder created will be "uuid".
    */
  download: function download() {
    var _this = this;
    if (_this.type === 'npm') {
      return request(_this._tarball).then(function(file) {
        return request.unpack(file);
      }).then(function(tarball) {
        tarball.on('entry', function(info, file, callback) {
          var filePath = path.join(_this.location, info.name.slice(8));
          mkdirp(path.dirname(filePath), function(err) {
            if (err) return Promise.reject(err);
            var write = fs.createWriteStream(filePath);
            file.on('end', callback);
            file.pipe(write);
          });
        });
      });
    } else if (_this.type === 'git') {
      return new Promise(function(resolve, reject) {
        clone(_this.git, _this.location, function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  },

  /*! Create a smylink from "location" to "local".  Using "force" overwrites any
    * symlink or file already present.
    */
  link: function link(local) {
    var _this = this;
    return new Promise(function(resolve, reject) {
      mkdirp(path.dirname(local), function(err) {
        if (err) return reject(err);
        fs.symlink(_this.location, local, function(err) {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  },

  // Validate the package's properties.
  _validate: function _validate() {
    if (!this.name || !validate(this.name).validForNewPackages) throw ERR_NAME;
    if (this.type !== 'npm' && this.type !== 'git') throw ERR_TYPE;
    if (this.type === 'npm' && !semver.valid(this.version)) throw ERR_VERSION;
    if (this.type === 'git' && !this.git) throw ERR_GIT;
  },

  // Simple toString method
  toString: function toString() {
    return this.uuid;
  },

  toJSON: function toJSON() {
    return this.toString();
  }
};
