const CronJob = require('cron').CronJob;
const Cron = require('./backup.js');
const MainPrizePool = require('./models/main-prize-pool.model');
const Prizes = require('./models/prizes.model');
const PrizePoolData = require('./models/prize-pool-data.model');
const moment = require('moment-timezone');

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
      const today = moment().tz('Australia/Sydney').startOf('day').toDate();
      
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
      
      console.log(`Daily prize pool reset completed at ${moment().tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss')} AEST/AEDT. Updated ${result.modifiedCount} prizes.`);
    } catch (error) {
      console.error('Error in daily prize pool reset:', error);
    }
  },
  null,
  true,
  'Australia/Sydney' // Australian Eastern Time (AEST/AEDT)
);

// Monthly prize rollback (runs at 12:00:01 am AEST on the 1st of each month)
new CronJob(
  '1 0 0 1 * *', // 1 second past midnight on the 1st of each month
  async function () {
    try {
      const nowAEST = moment().tz('Australia/Sydney');
      console.log(`Starting monthly prize rollback at ${nowAEST.format('YYYY-MM-DD HH:mm:ss')} AEST/AEDT`);
      
      // Find all active, unclaimed prizes
      const activePrizes = await Prizes.find({
        Status: 'Active',
        IsActive: true,
        IsDeleted: false,
        ClaimedBy: null
      });

      let rolledBackCount = 0;
      const currentMonthAEST = nowAEST.month();
      const currentYearAEST = nowAEST.year();
      const monthStartAEST = nowAEST.clone().startOf('month');
      const monthEndAEST = nowAEST.clone().endOf('month');

      for (const prize of activePrizes) {
        // Check if we're in a different month/year than when the prize was dropped (using AEST)
        const prizeDropDateAEST = moment(prize.DropDate).tz('Australia/Sydney');
        const prizeDropMonth = prizeDropDateAEST.month();
        const prizeDropYear = prizeDropDateAEST.year();

        // If we're in a different month/year, rollback (re-activate) with new month's promotional period
        if (currentMonthAEST !== prizeDropMonth || currentYearAEST !== prizeDropYear) {
          // Check if a rollback entry already exists for this month to avoid duplicates
          const existingRollbackEntry = await PrizePoolData.findOne({
            PrizeEntryId: prize._id,
            EventType: 'Created',
            Date: {
              $gte: monthStartAEST.toDate(),
              $lte: monthEndAEST.toDate()
            }
          });

          if (existingRollbackEntry) {
            // Already rolled back this month, skip
            continue;
          }

          // Re-activate prize with new month's promotional period
          prize.Status = 'Active';
          prize.DropDate = nowAEST.clone().startOf('day').toDate();
          prize.DropTime = nowAEST.format('HH:mm:ss');
          await prize.save();

          // Create new "Created" event with new month's promotional period
          const promoStart = monthStartAEST.clone().add(1, 'second').format('D MMM YYYY h:mm:ss a');
          const promoEnd = monthEndAEST.clone().subtract(1, 'second').format('D MMM YYYY h:mm:ss a');
          const timezone = nowAEST.isDST() ? 'AEDT' : 'AEST';
          
          const prizePoolEntry = new PrizePoolData();
          prizePoolEntry.Date = nowAEST.toDate();
          prizePoolEntry.Time = nowAEST.format('HH:mm:ss');
          prizePoolEntry.PrizeId = prize.PrizeId;
          prizePoolEntry.PrizeDescription = prize.PrizeDescription;
          prizePoolEntry.Value = prize.PrizeValue;
          prizePoolEntry.From = 'Gotcha System';
          prizePoolEntry.To = 'Map';
          prizePoolEntry.EventType = 'Created';
          prizePoolEntry.Status = 'Active';
          prizePoolEntry.Notes = `Rolled back to new month - ${promoStart} - ${promoEnd} ${timezone}`;
          prizePoolEntry.UserId = null;
          prizePoolEntry.PrizeEntryId = prize._id;
          prizePoolEntry.PromotionalPeriod = `${promoStart} - ${promoEnd} ${timezone}`;
          await prizePoolEntry.save();

          rolledBackCount++;
        }
      }

      console.log(`Monthly prize rollback completed: ${rolledBackCount} prize(s) rolled back to new month`);
    } catch (error) {
      console.error('Error in monthly prize rollback:', error);
    }
  },
  null,
  true,
  'Australia/Sydney' // Australian Eastern Time (AEST/AEDT)
);
