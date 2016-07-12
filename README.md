# lavish [![travis build][travis-icon]][travis] ![david dm][david-dm]
> Better "npm install" using global cache and symlinking.

Lavish downloads a flat package structure then uses symlinking for all dependencies.  After you download a package once or twice, it will symlink instantly from there on out.  This allows you to download less files and save time installing packages.

![Usage][usage-gif]

Note: In early stages, may or may not be usable.

## Installation
```sh
npm install -g lavish
```

## Usage
Using the CLI directly:
```sh
lavish <...packages>
```

Using the CLI shim on `npm`:
```sh
alias npm=lavish-shim
```
```sh
npm install <...packages>
```

Should be 100% compatible with `npm install`.  Open an issue if you find incompatibility.

## Credits
| ![jamen][avatar] |
|:---:|
| [Jamen Marzonie][github] |

## License
[MIT](LICENSE) &copy; Jamen Marzonie

[avatar]: https://avatars.githubusercontent.com/u/6251703?v=3&s=125
[github]: https://github.com/jamen
[usage-gif]: docs/usage.gif
[travis-icon]: https://travis-ci.org/jamen/lavish.svg
[travis]: https://travis-ci.org/jamen/lavish
[david-dm]: https://david-dm.org/jamen/lavish.svg
