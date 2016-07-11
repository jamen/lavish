# lavish
> More efficient "npm install" using globals dirs + symlinking.

Lavish downloads a flat package structure, and uses symlinking for all dependencies.  After you download a package once or twice, it will symlink instantly from there on out.  This allows you to download less files and save time installing packages.

![Usage][usage-gif]

Note: In early stages, may or may not be usable.

## Installation
```sh
npm install -g lavish
```

## Usage
Install packages with the CLI:
```sh
lavish <...packages>
```

Using the shim as an alias.
```sh
alias npm=lavish-shim
```
```sh
npm install <...packages>
```

## Credits
| ![jamen][avatar] |
|:---:|
| [Jamen Marzonie][github] |

## License
[MIT](LICENSE) &copy; Jamen Marzonie

[avatar]: https://avatars.githubusercontent.com/u/6251703?v=3&s=125
[github]: https://github.com/jamen
[usage-gif]: docs/usage.gif
