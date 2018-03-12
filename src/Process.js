const lockfile = require('lockfile');

module.exports.lock = () => {
  return new Promise(function(resolve, reject){
    lockfile.lock('../.lock', {}, err => {
      return err ? reject() : resolve();
    })
  })
}
