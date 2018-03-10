FROM mariadb

RUN apt-get update && apt-get install -qq -y \
    curl \
    mariadb-backup-10.2 \
    cron

#install node
RUN curl -sL https://deb.nodesource.com/setup_9.x | bash - && \
    apt-get install nodejs -y && \
    rm -rf /var/lib/apt/lists/*

ADD . /app
RUN ln -s /app/index.js /usr/local/bin/backup

COPY docker-entrypoint.sh /usr/local/bin/
COPY db-backup.cron /etc/cron.d/db_backup_cron

