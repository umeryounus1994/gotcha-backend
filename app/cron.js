const CronJob = require('cron').CronJob;
const Cron = require('./backup.js');
const MainPrizePool = require('./models/main-prize-pool.model');
const moment = require('moment');

// AutoBackUp every week (at 00:00 on Sunday - Australian time)
new CronJob(
  '0 0 */1 * * *',
  function () {
    Cron.dbAutoBackUp();
  },
  null,
  true,
  'Australia/Sydney' // Australian Eastern Time (AEST/AEDT)
);

// Daily reset for prize pool counters (runs at midnight Australian time)
new CronJob(
  '0 0 0 * * *', // Every day at 00:00:00
  async function () {
    try {
      const today = moment().startOf('day').toDate();
      
      // Reset all daily counters
      const result = await MainPrizePool.updateMany(
        { IsActive: true, IsDeleted: false },
        {
          $set: {
            DailyCounter: 0,
            LastResetDate: today
          }
        }
      );
      
      console.log(`Daily prize pool reset completed at ${moment().format('YYYY-MM-DD HH:mm:ss')} AEST/AEDT. Updated ${result.modifiedCount} prizes.`);
    } catch (error) {
      console.error('Error in daily prize pool reset:', error);
    }
  },
  null,
  true,
  'Australia/Sydney' // Australian Eastern Time (AEST/AEDT)
);
