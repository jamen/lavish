var semver = require('semver');

module.exports = function satisfy(list, rule, distTags) {
  if (distTags[rule]) rule = distTags[rule];
  list = list.sort().reverse();
  for (var i = 0, max = list.length; i < max; i++) {
    if (semver.satisfies(list[i], rule)) {
      return list[i];
    }
  }
  return null;
};
