let Affiliates = require('../models/affiliate.model');
let AffiliateSale = require('../models/affiliate-sale.model');
let Users = require('../models/users.model');
const bcrypt = require('bcrypt');
const saltRounds = 10;
let jwt = require('jsonwebtoken');
let Constants = require('../app.constants');
const moment = require('moment-timezone');

moment.tz.setDefault('Australia/Sydney');

// Affiliate login - returns JWT + affiliate data
exports.login = function (req, res) {
  var Email = (req.body.Email || '').toLowerCase().trim();
  var Password = req.body.Password;

  Affiliates.findOne({ Email: Email }, function (err, affiliate) {
    if (err) {
      console.error('[affiliate.login] findOne error:', err.message || err);
      return res.json({ success: false, message: 'Server Error', data: null });
    }
    if (!affiliate) {
      return res.json({ success: false, message: 'No affiliate found with this email', data: null });
    }
    if (affiliate.Status !== 'ACTIVE') {
      return res.json({ success: false, message: 'Account is not active. Contact administrator.', data: null });
    }
    bcrypt.compare(Password, affiliate.Password, function (err, matched) {
      if (err || !matched) {
        return res.json({ success: false, message: 'Incorrect password', data: null });
      }
      var payload = {
        Id: affiliate._id,
        Email: affiliate.Email,
        FullName: affiliate.FullName,
        role: 'affiliate',
      };
      var token = jwt.sign(payload, Constants.JWT.secret, { expiresIn: '10d' });
      var data = {
        Id: affiliate._id,
        FullName: affiliate.FullName,
        Email: affiliate.Email,
        AffiliateURL: affiliate.AffiliateURL,
        TrackingID: affiliate.TrackingID,
        PayoutsDriveUrl: affiliate.PayoutsDriveUrl || '',
        Status: affiliate.Status,
      };
      res.json({ success: true, message: 'Welcome Back!', data: data, token: token });
    });
  });
};

// Dashboard for logged-in affiliate (sales + users count by period)
exports.dashboard = function (req, res) {
  var affiliateId = req.decoded && req.decoded.role === 'affiliate' && req.decoded.Id ? req.decoded.Id : null;
  if (!affiliateId) {
    return res.json({ success: false, message: 'Unauthorized', data: null });
  }
  var period = req.query.period || '7d';
  var startDate = req.query.startDate ? moment(req.query.startDate).startOf('day') : null;
  var endDate = req.query.endDate ? moment(req.query.endDate).endOf('day') : null;

  var range = { start: null, end: null };
  if (period === 'custom' && startDate && endDate && startDate.isValid() && endDate.isValid()) {
    range.start = startDate.toDate();
    range.end = endDate.toDate();
  } else {
    range.end = moment().endOf('day').toDate();
    if (period === 'today') range.start = moment().startOf('day').toDate();
    else if (period === '7d') range.start = moment().subtract(7, 'days').startOf('day').toDate();
    else if (period === '14d') range.start = moment().subtract(14, 'days').startOf('day').toDate();
    else if (period === '30d') range.start = moment().subtract(30, 'days').startOf('day').toDate();
    else range.start = moment().subtract(7, 'days').startOf('day').toDate();
  }

  Affiliates.findById(affiliateId, function (err, affiliate) {
    if (err || !affiliate) {
      if (err) console.error('[affiliate.dashboard] findById error:', err.message || err);
      return res.json({ success: false, message: 'Affiliate not found', data: null });
    }

    AffiliateSale.aggregate(
      [
        { $match: { AffiliateId: affiliate._id, SaleDate: { $gte: range.start, $lte: range.end } } },
        { $group: { _id: null, total: { $sum: '$Amount' }, daily: { $push: { date: '$SaleDate', amount: '$Amount' } } } },
      ],
      function (errSale, aggSale) {
        if (errSale) {
          console.error('[affiliate.dashboard] AffiliateSale.aggregate (total) error:', errSale.message || errSale);
          return res.json({ success: false, message: 'Error fetching sales', data: null });
        }
        var totalSalesAUD = (aggSale && aggSale[0] && aggSale[0].total) ? aggSale[0].total : 0;

        AffiliateSale.aggregate(
          [
            { $match: { AffiliateId: affiliate._id, SaleDate: { $gte: range.start, $lte: range.end } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$SaleDate' } }, amount: { $sum: '$Amount' } } },
            { $sort: { _id: 1 } },
          ],
          function (errDaily, dailyBreakdown) {
            if (errDaily) {
              console.error('[affiliate.dashboard] AffiliateSale.aggregate (daily) error:', errDaily.message || errDaily);
              return res.json({ success: false, message: 'Error fetching daily data', data: null });
            }
            Users.countDocuments({ AffiliateId: affiliate._id, CreationTimestamp: { $gte: range.start, $lte: range.end } }, function (errUsers, userCount) {
              if (errUsers) userCount = 0;
              var data = {
                affiliate: {
                  Id: affiliate._id,
                  FullName: affiliate.FullName,
                  Email: affiliate.Email,
                  AffiliateURL: affiliate.AffiliateURL,
                  PayoutsDriveUrl: affiliate.PayoutsDriveUrl || '',
                },
                totalSalesVolumeAUD: totalSalesAUD,
                combinedEarnings: totalSalesAUD,
                usersCount: userCount,
                dailyBreakdown: (dailyBreakdown || []).map(function (d) {
                  return { date: d._id, salesAUD: d.amount };
                }),
                period: period,
                startDate: range.start,
                endDate: range.end,
              };
              res.json({ success: true, message: 'OK', data: data });
            });
          }
        );
      }
    );
  });
};

// ---- Internal APIs (protected by x-internal-api-key in routes) ----

// Get one affiliate by id (internal) - for edit form
exports.getOneInternal = function (req, res) {
  var Id = req.params.id || req.query.id;
  Affiliates.findById(Id, { Password: 0 }).lean().exec(function (err, affiliate) {
    if (err) {
      console.error('[affiliate.getOneInternal] findById error:', err.message || err);
      return res.json({ success: false, message: 'Server Error', data: null });
    }
    if (!affiliate) return res.json({ success: false, message: 'Affiliate not found', data: null });
    res.json({ success: true, message: 'OK', data: affiliate });
  });
};

// List affiliates (internal) - search, pagination
exports.listInternal = function (req, res) {
  var search = (req.query.search || '').trim();
  var page = Math.max(1, parseInt(req.query.page, 10) || 1);
  var limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  var skip = (page - 1) * limit;
  var query = {};
  if (search) {
    query.$or = [
      { FullName: new RegExp(search, 'i') },
      { Email: new RegExp(search, 'i') },
    ];
  }
  Affiliates.find(query, { Password: 0 })
    .sort({ RegistrationDate: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec(function (err, list) {
      if (err) {
        console.error('[affiliate.listInternal] find error:', err.message || err);
        return res.json({ success: false, message: 'Server Error', data: [] });
      }
      Affiliates.countDocuments(query, function (errC, total) {
        if (errC) {
          console.error('[affiliate.listInternal] countDocuments error:', errC.message || errC);
          total = (list || []).length;
        }
        res.json({
          success: true,
          message: total + ' record(s) found',
          data: list,
          total: total,
          page: page,
          limit: limit,
        });
      });
    });
};

// Create affiliate (internal) - enforce unique AffiliateURL and TrackingID
exports.createInternal = function (req, res) {
  var FullName = (req.body.FullName || '').trim();
  var Email = (req.body.Email || '').toLowerCase().trim();
  var Password = req.body.Password;
  var AffiliateURL = (req.body.AffiliateURL || '').trim();
  var TrackingID = (req.body.TrackingID || '').trim().toUpperCase();
  var Status = (req.body.Status || 'ACTIVE').toUpperCase();
  var PayoutsDriveUrl = (req.body.PayoutsDriveUrl || '').trim();

  if (!FullName || !Email || !Password || !AffiliateURL || !TrackingID) {
    return res.json({ success: false, message: 'FullName, Email, Password, AffiliateURL and TrackingID are required', data: null });
  }
  if (Status !== 'ACTIVE' && Status !== 'INACTIVE') Status = 'ACTIVE';

  Affiliates.findOne({ Email: Email }, function (err, exist) {
    if (err) {
      console.error('[affiliate.createInternal] findOne Email error:', err.message || err);
      return res.json({ success: false, message: 'Server Error', data: null });
    }
    if (exist) return res.json({ success: false, message: 'Email already in use', data: null });
    Affiliates.findOne({ AffiliateURL: AffiliateURL }, function (err2, exist2) {
      if (err2) {
        console.error('[affiliate.createInternal] findOne AffiliateURL error:', err2.message || err2);
        return res.json({ success: false, message: 'Server Error', data: null });
      }
      if (exist2) return res.json({ success: false, message: 'Affiliate URL must be unique', data: null });
      Affiliates.findOne({ TrackingID: TrackingID }, function (err3, exist3) {
        if (err3) {
          console.error('[affiliate.createInternal] findOne TrackingID error:', err3.message || err3);
          return res.json({ success: false, message: 'Server Error', data: null });
        }
        if (exist3) return res.json({ success: false, message: 'Tracking ID must be unique', data: null });
        doCreate();
        function doCreate() {
          bcrypt.hash(Password, saltRounds, function (errHash, hash) {
            if (errHash) {
              console.error('[affiliate.createInternal] bcrypt.hash error:', errHash.message || errHash);
              return res.json({ success: false, message: 'Server Error', data: null });
            }
            var affiliate = new Affiliates();
            affiliate.FullName = FullName;
            affiliate.Email = Email;
            affiliate.Password = hash;
            affiliate.AffiliateURL = AffiliateURL;
            affiliate.TrackingID = TrackingID;
            affiliate.Status = Status;
            affiliate.PayoutsDriveUrl = PayoutsDriveUrl;
            affiliate.save(function (errSave, saved) {
              if (errSave) {
                console.error('[affiliate.createInternal] save error:', errSave.message || errSave, errSave.code);
                if (errSave.code === 11000) return res.json({ success: false, message: 'Affiliate URL or Tracking ID already exists', data: null });
                return res.json({ success: false, message: 'Validation Error', data: errSave.message });
              }
              var out = saved.toObject();
              delete out.Password;
              res.json({ success: true, message: 'Affiliate registered', data: out });
            });
          });
        }
      });
    });
  });
};

// Update affiliate (internal)
exports.updateInternal = function (req, res) {
  var Id = req.body.Id || req.params.id;
  var FullName = (req.body.FullName || '').trim();
  var Email = (req.body.Email || '').toLowerCase().trim();
  var Password = req.body.Password;
  var AffiliateURL = (req.body.AffiliateURL || '').trim();
  var TrackingID = (req.body.TrackingID || '').trim().toUpperCase();
  var Status = (req.body.Status || '').toUpperCase();
  var PayoutsDriveUrl = (req.body.PayoutsDriveUrl || '').trim();

  Affiliates.findById(Id, function (err, affiliate) {
    if (err || !affiliate) {
      return res.json({ success: false, message: 'Affiliate not found', data: null });
    }
    var updatedData = {
      FullName: FullName || affiliate.FullName,
      Email: Email || affiliate.Email,
      AffiliateURL: AffiliateURL || affiliate.AffiliateURL,
      TrackingID: TrackingID || affiliate.TrackingID,
      Status: (Status === 'ACTIVE' || Status === 'INACTIVE') ? Status : affiliate.Status,
      PayoutsDriveUrl: PayoutsDriveUrl !== undefined ? PayoutsDriveUrl : (affiliate.PayoutsDriveUrl || ''),
    };

    function checkUniqueThenUpdate() {
      if (AffiliateURL && AffiliateURL !== affiliate.AffiliateURL) {
        Affiliates.findOne({ AffiliateURL: AffiliateURL }, function (e, other) {
          if (other) return res.json({ success: false, message: 'Affiliate URL must be unique', data: null });
          if (TrackingID && TrackingID !== affiliate.TrackingID) {
            Affiliates.findOne({ TrackingID: TrackingID }, function (e2, other2) {
              if (other2) return res.json({ success: false, message: 'Tracking ID must be unique', data: null });
              doUpdate();
            });
          } else doUpdate();
        });
      } else if (TrackingID && TrackingID !== affiliate.TrackingID) {
        Affiliates.findOne({ TrackingID: TrackingID }, function (e2, other2) {
          if (other2) return res.json({ success: false, message: 'Tracking ID must be unique', data: null });
          doUpdate();
        });
      } else doUpdate();
    }

    function doUpdate() {
      if (Password && Password.length >= 6) {
        bcrypt.hash(Password, saltRounds, function (errHash, hash) {
          if (errHash) return res.json({ success: false, message: 'Server Error', data: null });
          updatedData.Password = hash;
          Affiliates.updateOne({ _id: Id }, updatedData, function (errU) {
            if (errU) return res.json({ success: false, message: errU.message || 'Update failed', data: null });
            Affiliates.findById(Id, { Password: 0 }).lean().exec(function (e, updated) {
              res.json({ success: true, message: 'Updated', data: updated });
            });
          });
        });
      } else {
        delete updatedData.Password;
        Affiliates.updateOne({ _id: Id }, updatedData, function (errU) {
          if (errU) return res.json({ success: false, message: errU.message || 'Update failed', data: null });
          Affiliates.findById(Id, { Password: 0 }).lean().exec(function (e, updated) {
            res.json({ success: true, message: 'Updated', data: updated });
          });
        });
      }
    }
    checkUniqueThenUpdate();
  });
};

// Delete affiliate (internal)
exports.deleteInternal = function (req, res) {
  var Id = req.body.Id || req.params.id;
  Affiliates.findByIdAndRemove(Id, function (err, doc) {
    if (err) {
      console.error('[affiliate.deleteInternal] findByIdAndRemove error:', err.message || err);
      return res.json({ success: false, message: 'Server Error', data: null });
    }
    if (!doc) return res.json({ success: false, message: 'Affiliate not found', data: null });
    res.json({ success: true, message: 'Affiliate deleted', data: { id: Id } });
  });
};

// Tracking Affiliate Sales (internal) - list with Sales AUD + Users count, search, date filter, pagination
exports.salesInternal = function (req, res) {
  var search = (req.query.search || '').trim();
  var startM = req.query.startDate ? moment(req.query.startDate).startOf('day') : null;
  var endM = req.query.endDate ? moment(req.query.endDate).endOf('day') : null;
  var startDate = (startM && startM.isValid()) ? startM.toDate() : null;
  var endDate = (endM && endM.isValid()) ? endM.toDate() : null;
  var page = Math.max(1, parseInt(req.query.page, 10) || 1);
  var limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  var skip = (page - 1) * limit;

  var matchAffiliate = {};
  if (search) {
    matchAffiliate.$or = [
      { FullName: new RegExp(search, 'i') },
      { Email: new RegExp(search, 'i') },
    ];
  }

  Affiliates.countDocuments(matchAffiliate, function (errCount, total) {
    if (errCount) {
      console.error('[affiliate.salesInternal] countDocuments error:', errCount.message || errCount);
      return res.json({
        success: false,
        message: 'Server Error',
        data: [],
        error: errCount.message || String(errCount),
      });
    }
    total = total == null ? 0 : total;
    Affiliates.find(matchAffiliate).sort({ RegistrationDate: -1 }).skip(skip).limit(limit).lean().exec(function (err, affiliates) {
      if (err) {
        console.error('[affiliate.salesInternal] find affiliates error:', err.message || err);
        return res.json({
          success: false,
          message: 'Server Error',
          data: [],
          error: err.message || String(err),
        });
      }
      var ids = (affiliates || []).map(function (a) { return a._id; });
      if (ids.length === 0) {
        return res.json({ success: true, message: '0 records', data: [], total: total, page: page, limit: limit });
      }

      var saleMatch = { AffiliateId: { $in: ids } };
      if (startDate) { saleMatch.SaleDate = saleMatch.SaleDate || {}; saleMatch.SaleDate.$gte = startDate; }
      if (endDate) { saleMatch.SaleDate = saleMatch.SaleDate || {}; saleMatch.SaleDate.$lte = endDate; }

      AffiliateSale.aggregate([
        { $match: saleMatch },
        { $group: { _id: '$AffiliateId', salesAUD: { $sum: '$Amount' } } },
      ]).exec(function (errSale, salesByAffiliate) {
        if (errSale) {
          console.error('[affiliate.salesInternal] AffiliateSale.aggregate error:', errSale.message || errSale);
          return res.json({
            success: false,
            message: 'Server Error',
            data: [],
            error: errSale.message || String(errSale),
          });
        }
        var salesMap = {};
        (salesByAffiliate || []).forEach(function (s) {
          var key = s._id != null ? s._id.toString() : '';
          if (key) salesMap[key] = s.salesAUD;
        });

        var userMatch = { AffiliateId: { $in: ids } };
        if (startDate) { userMatch.CreationTimestamp = userMatch.CreationTimestamp || {}; userMatch.CreationTimestamp.$gte = startDate; }
        if (endDate) { userMatch.CreationTimestamp = userMatch.CreationTimestamp || {}; userMatch.CreationTimestamp.$lte = endDate; }
        Users.aggregate([
          { $match: userMatch },
          { $group: { _id: '$AffiliateId', users: { $sum: 1 } } },
        ]).exec(function (errUsers, usersByAffiliate) {
          if (errUsers) {
            console.error('[affiliate.salesInternal] Users.aggregate error:', errUsers.message || errUsers);
            usersByAffiliate = [];
          }
          var usersMap = {};
          (usersByAffiliate || []).forEach(function (u) {
            var key = u._id != null ? u._id.toString() : '';
            if (key) usersMap[key] = u.users;
          });

          var rows = affiliates.map(function (a) {
            var idStr = a._id != null ? a._id.toString() : '';
            return {
              _id: a._id,
              fullName: a.FullName,
              email: a.Email,
              salesAUD: salesMap[idStr] || 0,
              users: usersMap[idStr] || 0,
            };
          });
          res.json({
            success: true,
            message: total + ' record(s)',
            data: rows,
            total: total,
            page: page,
            limit: limit,
          });
        });
      });
    });
  });
};

// Optional: add a sale record (internal or from payment webhook)
exports.addSaleInternal = function (req, res) {
  var AffiliateId = req.body.AffiliateId;
  var Amount = parseFloat(req.body.Amount) || 0;
  var UserId = req.body.UserId || null;
  if (!AffiliateId || Amount <= 0) {
    return res.json({ success: false, message: 'AffiliateId and positive Amount required', data: null });
  }
  var sale = new AffiliateSale();
  sale.AffiliateId = AffiliateId;
  sale.Amount = Amount;
  sale.UserId = UserId;
  sale.save(function (err, saved) {
    if (err) {
      console.error('[affiliate.addSaleInternal] save error:', err.message || err);
      return res.json({ success: false, message: err.message || 'Save failed', data: null });
    }
    res.json({ success: true, message: 'Sale recorded', data: saved });
  });
};
