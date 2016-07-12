var createUuid = require('uuid');
var path = require('path');
var EventEmitter = require('events');
var fetch = require('./fetch');
var Promise = require('bluebird');
var os = require('os');
var mkdirp = Promise.promisify(require('mkdirp'));
var jsonAssign = Promise.promisify(require('json-assign'));
var fs = Promise.promisifyAll(require('fs'));
var select = require('./select');
var exec = Promise.promisify(require('child_process').exec);

var API = 'https://registry.npmjs.org/';

module.exports = function manager(options) {
  options = options || {};

  // Required options.
  var name = options.name;
  var version = options.version;

  // Some private data and/or dynamic option.
  var uuid = options.uuid || createUuid();
  var manage = {};
  var events = new EventEmitter();
  var local = options.local;
  if (!local) local = path.join(os.homedir(), '.lavish', name, uuid);
  var remote = options.remote;
  if (!remote) remote = API + name + '/-/' + name + '-' + version + '.tgz';
  var lavishJson = {_lavish: {uuid: uuid, local: local, remote: remote}};
  var pkgJsonPath = path.join(local, 'package.json');

  // Cache object
  var cache = {
    is: function(prop) {
      return typeof cache[prop] !== 'undefined';
    }
  };

  var error = function error(err) {
    events.emit('error', err, manager);
    return Promise.reject(err);
  };

  // Emitting events on "events".
  var emit = manage.emit = function emit() {
    return events.emit.apply(events, arguments);
  };

  // Binding events on "events".
  manage.on = function on() {
    return events.on.apply(events, arguments);
  };

  // Download "remote" to "local"
  manage.download = function download() {
    // Emit predownload event.
    emit('predownload');

    // Request the remote gzipped tarball.
    return fetch(remote).then(function(tarball) {
      // Unpack the gzipped tarball and write each file to "local"
      return fetch.unpack(tarball, function(tarPath, file) {
        var filePath = path.join(local, tarPath);
        return mkdirp(path.dirname(filePath)).then(function() {
          if (tarPath === 'package.json') file.on('end', function() {
            // If the file is package.json, add some of lavish's information.
            jsonAssign(pkgJsonPath, lavishJson);
          });
          // Write file.
          file.pipe(fs.createWriteStream(filePath));
        });
      });
    }).then(function() {
      emit('download');
    }, error);
  };

  // Check if "local" exists.
  manage.hasLocal = function hasLocal() {
    return fs.statAsync(path.join(local, 'package.json')).then(function(stat) {
      // Exists, make sure it is a file too.
      return stat.isFile();
    }, function(err) {
      // If non-existent, just return false.
      if (err.code === 'ENOENT') return Promise.resolve(false);
      // Otherwise, pass on error again.
      return error(err);
    });
  };

  // Creates a "symlink" from local to "location".
  manage.link = function link(location) {
    return manage.info().then(function(info) {
      // Emit prelink event.
      emit('prelink', info);
      return mkdirp(path.dirname(location));
    }).then(function() {
      // Create symlink
      return fs.symlinkAsync(local, location);
    }).catch(function(err) {
      if (err.code === 'EEXIST') return Promise.resolve(true);
      return error(err);
    }).then(function() {
      return emit('link');
    });
  };

  manage.info = function() {
    if (cache.is('info')) return Promise.resolve(cache.info);
    return manage.hasLocal().then(function(hasLocal) {
      if (!hasLocal) return fetch(API + name + '/' + version);
      return fs.createReadStream(path.join(local, 'package.json'));
    }).then(function(file) {
      return fetch.json(file);
    }).then(function(pkg) {
      cache.info = {
        name: pkg.name,
        version: pkg.version,
        uuid: uuid,
        bin: pkg.bin,
        desc: pkg.desc,
        author: pkg.author,
        license: pkg.license,
        remote: remote,
        local: local,
        dependencies: pkg.dependencies,
        devDependencies: pkg.devDependencies,
        peerDependencies: pkg.peerDependencies
      };
      return cache.info;
    }, error);
  };

  manage.events = function(newEvents) {
    events = newEvents;
  };

  manage.bin = function(location) {
    return manage.info().then(function(info) {
      return [info, mkdirp(path.dirname(location))];
    }).all().spread(function(info) {
      if (info.bin) {
        if (info.bin.constructor === Object) {
          var names = Object.keys(info.bin);
          return Promise.map(names, function(name) {
            var binPath = path.resolve(local, info.bin[name]);
            var linkPath = path.join(location, name);
            return Promise.all([
              binPath,
              mkdirp(path.dirname(linkPath))
            ]).spread(function(binPath) {
              return fs.symlinkAsync(binPath, linkPath);
            }).then(function() {
              return exec('chmod a+x ' + binPath);
            });
          });
        }
        var binPath = path.resolve(local, info.bin);
        var linkPath = path.join(location, name);
        return mkdirp(path.dirname(linkPath)).then(function() {
          return fs.symlinkAsync(binPath, linkPath);
        }).then(function() {
          return exec('chmod a+x ' + binPath);
        });
      }
    });
  };

  manage.install = function install(location) {
    location = path.join(location, 'node_modules', name);

    // Emit preinstall event.
    emit('preinstall');

    return manage.hasLocal().then(function(hasLocal) {
      // Create if it doesn't exist.
      if (!hasLocal) return manage.download().then(function() {
        return manage.info();
      }).then(function(info) {
        // Install dependencies.
        var deps = info.dependencies;
        if (deps) {
          var depSelects = [];
          var depNames = Object.keys(deps);
          for (var i = 0, max = depNames.length; i < max; i++) {
            var depName = depNames[i];
            depSelects.push(select(depName, deps[depName]));
          }

          return Promise.mapSeries(depSelects, function(dep) {
            emit('new dep', manage, dep);
            return dep.install(local);
          });
        }
      });
    }).then(function() {
      // Create symlink.
      return [
        manage.link(location),
        manage.bin(path.join(location, '..', '.bin'))
      ];
    }).all().then(function() {
      emit('install');
    }, error);
  };

  return manage;
};
