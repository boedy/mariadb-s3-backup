const child_process = require('child_process');
const s3 = require('./S3');
const moment = require('moment');

const mariaBackupConnectCmd = `mariabackup  --user root --password ${process.env.MYSQL_ROOT_PASSWORD}`;
const backupDir = '/backup';

const backupCompleted = () => {
  child_process.execSync('rm -rf /backup-previous');
  child_process.execSync(`mv ${backupDir} /backup-previous`);
  console.log('backup completed');
};

const fullBackup = (database, time) => {
  console.log('full backup');
  const weekYear = time.format('YYYY-WW');
  const backupTimeFormat = time.format('YYYYMMDDTHHmmss');
  child_process.execSync(`rm -rf ${backupDir}`);
  const command = `${mariaBackupConnectCmd} --backup --target-dir ${backupDir}`;
  child_process.execSync(command);
  return s3.uploadDir(backupDir, `${database}/${weekYear}/${backupTimeFormat}-base`).then(backupCompleted);
};

const incrementalBackup = (objects, database, time) => {
  console.log('incremental backup');
  const weekYear = time.format('YYYY-WW');
  const backupTimeFormat = time.format('YYYYMMDDTHHmmss');
  child_process.execSync(`rm -rf ${backupDir}`);
  const command = `${mariaBackupConnectCmd} --backup --incremental-basedir /backup-previous --target-dir ${backupDir}`;
  return s3.pullDir(objects[objects.length - 1], '/backup-previous')
    .then(() => {
      child_process.execSync(command);
      s3.uploadDir(backupDir, `${database}/${weekYear}/${backupTimeFormat}`).then(backupCompleted);
    });
};

const prepareBackup = (partName) => {
  return partName.indexOf('-base') !== -1
    ? prepareBase()
    : applyIncrement();
};

const prepareBase = () => {
  console.log('prepare base');
  child_process.execSync('rm -rf /mysql-backup; mv /backup-part /mysql-backup');
  const baseCmd = `mariabackup --user root --password root`;
  const restoreCmd = `--prepare --target-dir /mysql-backup --apply-log-only`;
  const command = `${baseCmd} ${restoreCmd}`;
  child_process.execSync(command);
};

const applyIncrement = () => {
  console.log('apply increment');
  const restoreCmd = `--prepare --target-dir /mysql-backup --incremental-dir /backup-part --apply-log-only`;
  child_process.execSync(`${mariaBackupConnectCmd} ${restoreCmd}`);
  child_process.execSync('rm -rf ./increment');
};

const getIncrementalPaths = (paths) => {
  const promises = paths.map(path =>
    s3.list(path).then(objects => objects.filter(val => val.indexOf('base') === -1))
  );
  return Promise.all(promises)
    .then(results => [].concat(...results));
};

const storedBackupsOlderThan = (database, time) => {
  return s3.list(`${database}/`)
    .then(paths => paths.filter(path => {
      const week = path.split('/')[1];
      if (week.length != 7) return false;
      return moment(week, 'YYYY-WW').isBefore(time);
    })
    )
    .then(paths => getIncrementalPaths(paths))
};

const determineCorrectBackupFiles = (database, time) => {
  const weekYear = time.format('YYYY-WW');
  return s3.list(`${database}/${weekYear}/`)
    .then(objects => objects.filter(val => {
      const result = moment(val.split('/')[2].replace('-base', ''));
      return result.isBefore(time);
    }).reduce((acc, val) => {
      if (val.indexOf('base') !== -1) acc = [];
      acc.push(val);
      return acc;
    }, []));
};

const finishRestore = () => {
  child_process.execSync('chown -R mysql:mysql /mysql-backup');
  console.log('finish restore');
};

module.exports = {
  fullBackup,
  incrementalBackup,
  prepareBackup,
  finishRestore,
  determineCorrectBackupFiles,
  storedBackupsOlderThan
};
