# Info
This Image is based of [MariaDB 10.2](https://github.com/docker-library/mariadb/blob/a99e44ae93547f37c653299aff36a393d14bc9eb/10.2/Dockerfile). It has been modified to allow for automatic backups which are stored on amazon S3. Backups are made using [MariaDb Backup](https://github.com/docker-library/mariadb/blob/a99e44ae93547f37c653299aff36a393d14bc9eb/10.2/Dockerfile). This repo wraps MariaDB Backup in a NodeJS CLI which stores the backups on S3.

## Backup strategy
A full backup is stored every sunday. Incremental backups are made every 15 minutes. Incremental backups are only stored for 14 days.

Read more here: https://mariadb.com/kb/en/library/mariadb-backup-overview/

## CLI commands
Run `backup -h` for available commands

- backup save
- backup restore
- backup remove-old

## Environment variable
- `STORAGE_KEY` AWS S3 key
- `STORAGE_SECRET` AWS S3 secret
- `STORAGE_REGION` AWS S3 region (default: eu-west-1)
- `STORAGE_BUCKET` AWS S3 bucket
- `STORAGE_PATH` default storage path
- `PUSHBULLET_KEY` Get PushBullet notifications if something fails (optional)
- `NOTIFY` (true/false) => notify via PushBullet

#### Disclaimer
Use at own risk. Always test, before using in production.
