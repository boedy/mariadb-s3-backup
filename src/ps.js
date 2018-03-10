const exec = require('child_process').exec

const isNotRunning = () => {
  return new Promise(function(resolve, reject){
    const cmd = 'ps -x';
    exec(cmd, function(err, stdout, stderr) {
      const isRunning = stdout.toLowerCase().split('/usr/local/bin/backup').length > 2
      return isRunning ? reject() : resolve();
    })
  })
}

module.exports = {
  isNotRunning
}
