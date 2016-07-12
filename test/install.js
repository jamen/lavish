select('audio', '~1.1.0').then(function(audio) {
  audio.on('preinstall', () => console.log('starting install'));
  audio.on('predownload', () => console.log('starting download'));
  audio.on('download', () => console.log('done downloading'));
  audio.on('prelink', () => console.log('starting link.'));
  audio.on('link', () => console.log('done linking'));
  audio.on('install', () => console.log('done installing'));

  return audio.install(process.cwd());
}).then(function() {
  console.log('Finished');
});
