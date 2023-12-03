const CronJob = require('cron').CronJob;
const Cron = require('./backup.js');

// AutoBackUp every week (at 00:00 on Sunday)
new CronJob(
  '0 0 */1 * * *',
  function () {
    Cron.dbAutoBackUp();
  },
  null,
  true,
  'America/New_York'
);
