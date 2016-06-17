var Promise = require('bluebird');
var write = require('safe-write-stream');
var path = require('path');
var request = require('./request');
var unpack = require('./unpack');
var satisfy = require('./satisfy');
var validateName = require('validate-npm-package-name');
var rimraf = Promise.promisify(require('rimraf'));
var fs = Promise.promisifyAll(require('fs'));

var defaultResource = path.join(process.env.HOME, '.lavish/packages');

var Package = function Package(name, opts) {
  this.name = name;
  opts = opts || {};

  var is = validateName(this.name);
  if (!is.validForNewPackages && !is.validForOldPackages) {
    throw new Error('Invalid package name.');
  }

  this._resourcePath = opts.resource || defaultResource;
  this.location = path.join(this._resourcePath, this.name);
  this._baseUrl = 'https://registry.npmjs.org/' + this.name + '/';
  this._tarUrl = this._baseUrl + '-/' + this.name + '-';
  this._cache = opts.info || {};
};

Package.prototype.download = function download(tag, force) {
  var pkg = this;

  return this.info().then(function(info) {
    var version = satisfy(Object.keys(info.versions), tag, info['dist-tags']);
    var proc = [request(pkg._tarUrl + version + '.tgz'), version];
    if (force) proc.push(rimraf(path.join(pkg.location, version)));
    return proc;
  }).spread(function(tarball, version) {
    return unpack(tarball, function entry(info, file, next) {
      var filePath = info.name.slice(8);
      file.pipe(write(path.join(pkg.location, version, filePath)));
      next();
    });
  });
};

Package.prototype.info = function info(tag, force) {
  var pkg = this;
  if (this._cache[tag] && !force) return Promise.resolve(this._cache[tag]);
  if (this._cache.__LAVISH) return Promise.resolve(this._cache.__LAVISH);
  var url = tag ? this._baseUrl + tag : this._baseUrl;
  return request(url).then(function(data) {
    return request.json(data);
  }).then(function(data) {
    if (tag) pkg._cache[tag] = data;
    else pkg._cache.__LAVISH = data;
    return data;
  });
};

Package.prototype.installed = function installed(version) {
  return Promise.all([
    fs.readdirAsync(this.location).catch(function(err) {
      if (err.code !== 'ENOENT') return Promise.reject(err);
    }),
    this.info()
  ]).spread(function(versions, info) {
    versions = versions || [];
    return satisfy(versions, version, info['dist-tags']);
  });
};

Package.prototype.link = function link(tag, to) {
  var pkg = this;
  return this.installed(tag).then(function(version) {
    return fs.symlinkAsync(path.join(pkg.location, version), to)
    .catch(function(err) {
      if (err.code !== 'EEXIST') return Promise.reject(err);
    });
  });
};

module.exports = Package;
