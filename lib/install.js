var Package = require('./package');
var routine = require('promise-routine');
var Promise = require('bluebird');
routine.Promise = Promise;
var path = require('path');
var fs = Promise.promisifyAll(require('fs'));
var mkdirp = Promise.promisify(require('mkdirp'));

module.exports = function install(name, tag, to, from) {
  var pkg = new Package(name, {
    resource: from
  });

  return pkg.installed(tag).then(function(version) {
    if (version) return version;
    console.log(tag);
    return pkg.download(tag, from).then(function() {
      return pkg.installed(tag);
    });
  }).then(function(version) {
    var infoLocation = path.join(pkg.location, version, 'package.json');
    return [version, fs.readFileAsync(infoLocation)];
  }).spread(function(version, raw) {
    var info = JSON.parse(raw);
    var link = pkg.link(version, to);
    var deps = info.dependencies;

    if (deps) {
      var depLocation = path.join(pkg.location, version, 'node_modules');
      var proc = Object.keys(deps).map(function(dep) {
        return [dep, deps[dep], path.join(depLocation, dep), from];
      });
      return mkdirp(depLocation).then(function() {
        var installDeps = routine(install, proc);
        return [link, installDeps];
      });
    }

    return link;
  });
};

module.exports('gulp', 'latest', process.cwd() + '/node_modules/gulp').catch(console.error);
