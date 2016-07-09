var manager = require('./manager');

var _mash = function _mash(deps) {
  var out = [];
  var names = Object.keys(deps);
  for (var i = names.length; i--;) {
    var name = names[i];
    out.push(name + '@' + deps[name]);
  }
  return out;
};

var install = function install(ids, location) {
  return Promise.all(ids.map(function(id) {
    var parts = id.split('@');
    var name = parts[0];
    var tag = parts[1] || 'latest-local';
    var pkg = manager(name);
    return pkg.load().then(function() {
      return pkg.install(tag, location);
    }).then(function(downloaded) {
      return [pkg.info(tag === 'latest' ? 'latest-local' : tag), downloaded];
    }).spread(function(info, downloaded) {
      if (info.dependencies && downloaded) {
        return install(_mash(info.dependencies), pkg.location(info.version));
      }
    });
  }));
};

module.exports = install;
