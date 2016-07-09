Note: Everything asynchronous returns a `Promise` unless otherwise stated.

## Package
 - Has a `uuid` property, a string of the package's UUID.
 - Has a `name` property, a string of the package's name.
 - Has a `type` property, a string of the package's type (`"npm"` or `"git"`).
 - Has a `version` property, a string of package's version (no tag, i.e. `"1.2.2"`), otherwise `null`.
 - Has a `git` property, a string of the package's git url, otherwise `null`.
 - Has a `location` property, a string to the package's path.
 - Has a private `tarball` property, a string to the package's gzipped tarball url for downloading, otherwise `null`.
 - Has a `download(force)` method, which downloads the package based on `this.type` to `this.location` (overwrites with `force`).
 - Has a `link(location, force)` method, which creates a symlink from `this.location` to `location` (overwrites with `force`).
 - Has a `install(location)` method, which integrates `this.download` and `this.install` together.

## Manager
 - Has a `registry` property, a tree of package names and versions, with boil down to `Package` objects.
 - Has a private `registryDir` property, a string path to the lavish registry directory.
 - Has a private `packagesDir` property, a string path of `registryDir` + `'/packages'`.
 - Has a `get(tag)` method, which returns a `Package` based on the `tag` (i.e. `audio@latest`, `jamen/lavish`, etc.)
 - Has an `install([...tags], location)` method, which is a shorthand method for installing all the gotten `tags` to `location`.
