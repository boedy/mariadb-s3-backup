#!/usr/bin/env node
require('dotenv').config();
const program = require('commander');
const moment = require('moment');
const s3 = require('./src/S3');
const mariaBackup = require('./src/MariaBackup');
const ps = require('./src/ps');
const log = require('./src/Log')

const backupInProgress = () => {
  log('backup in progress. Please try again later')
  process.exit()
}

program
  .command('save')
  .option('-p, --path <path>', 'Storage path')
  .option('-f, --full', 'Full backup')
  .action(function (cmd) {
    const time = moment();
    const weekYear = moment().format('YYYY-WW');
    const database = cmd.path || process.env.STORAGE_PATH;
    try{
      ps.isNotRunning()
        .catch(backupInProgress)
        .then(() => s3.list(`${database}/${weekYear}/`))
        .then(objects => (objects.length === 0 || cmd.full)
          ? mariaBackup.fullBackup(database, time)
          : mariaBackup.incrementalBackup(objects, database, time))
        .catch((e) => log(`failed backing up ${database}: ${e.message}`, 'Database Backup Failed!'));
    }catch (e){
      log(`failed backing up ${database}: ${e.message}`, 'Database Backup Failed!')
    }
  });

program
  .command('restore <dateTime>')
  .option('-p, --path <path>', 'Storage path')
  .action((time, cmd) => {
    const database = cmd.path || process.env.STORAGE_PATH;
    ps.isNotRunning()
      .catch(backupInProgress)
      .then(() => mariaBackup.determineCorrectBackupFiles(database, moment(time)))
      .then(backupFiles => backupFiles.reduce((promise, backupFile) =>
          promise.then(() => s3.pullDir(backupFile, '/backup-part').then(() => mariaBackup.prepareBackup(backupFile)))
        , Promise.resolve())
      )
      .then(mariaBackup.finishRestore);
  });

program
  .command('remove-old')
  .description('Removes old incremental backups')
  .option('-p, --path <path>', 'Storage path')
  .option('-d, --days <path>', 'amount of days before removal: default 30')
  .action((cmd) => {
    const path = cmd.path || process.env.STORAGE_PATH;
    try {
      mariaBackup.storedBackupsOlderThan(path, moment().subtract(cmd.days || 14, 'days'))
        .then(paths => s3.removeDirs(paths))
        .then(() => console.log('all done!'));
    } catch (e) {
      log(`failed removing all old backups for ${path}: ${e.message}`, 'Database Backup removal Failed!');
    }
  });

program.parse(process.argv);
