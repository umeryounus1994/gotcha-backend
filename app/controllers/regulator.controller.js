const Regulator = require('../models/regulator.model');
const PrizePoolData = require('../models/prize-pool-data.model');
const RNGData = require('../models/rng-data.model');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const moment = require('moment');
const jwt = require('jsonwebtoken');
const Constants = require('../app.constants');

// Regulator login
exports.login = function (req, res) {
  const Email = req.body.Email;
  const Password = req.body.Password;

  Regulator.findOne({ Email: Email, IsActive: true, IsDeleted: false }, function (err, regulator) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      if (regulator) {
        bcrypt.compare(Password, regulator.Password, function (err, matched) {
          if (matched) {
            const regulatorData = {
              Id: regulator._id,
              Email: regulator.Email,
              FullName: regulator.FullName,
              Role: regulator.Role,
            };
            
            // Generate JWT token
            const token = jwt.sign(regulatorData, Constants.JWT.secret, {
              expiresIn: '30d', // Regulator tokens last 30 days
            });
            
            res.json({
              success: true,
              message: 'Welcome ' + regulator.FullName,
              data: regulatorData,
              token: token,
            });
          } else {
            res.json({
              success: false,
              message: 'Incorrect Password',
              data: null,
            });
          }
        });
      } else {
        res.json({
          success: false,
          message: 'No Regulator Found',
          data: null,
        });
      }
    }
  });
};

// Register new regulator (admin only)
exports.register = function (req, res) {
  const Email = req.body.Email;
  const Password = req.body.Password;
  const FullName = req.body.FullName;

  Regulator.findOne({ Email: Email }, function (err, exist) {
    if (err) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: err,
      });
    } else {
      if (exist) {
        res.json({
          success: false,
          message: 'Email already exists!',
          data: Email,
        });
      } else {
        bcrypt.hash(Password, saltRounds, function (err, hash) {
          const regulator = new Regulator();
          regulator.Email = Email;
          regulator.Password = hash;
          regulator.FullName = FullName;
          regulator.Role = 'Regulator';

          regulator.save(function (err) {
            if (err) {
              res.json({
                success: false,
                message: 'Server Error',
                data: err,
              });
            } else {
              res.json({
                success: true,
                message: 'Successfully registered!',
                data: {
                  Id: regulator._id,
                  Email: regulator.Email,
                  FullName: regulator.FullName,
                  Role: regulator.Role,
                },
              });
            }
          });
        });
      }
    }
  });
};

// Get Prize Pool Data (regulator access only)
exports.getPrizePoolData = function (req, res) {
  const query = { IsDeleted: false };
  
  // Date filtering
  if (req.query.startDate && req.query.endDate) {
    const startDate = moment(req.query.startDate, 'DD/MM/YYYY').startOf('day').toDate();
    const endDate = moment(req.query.endDate, 'DD/MM/YYYY').endOf('day').toDate();
    query.Date = { $gte: startDate, $lte: endDate };
  }

  PrizePoolData.find(query)
    .populate('UserId', 'FullName Email')
    .sort({ Date: -1, Time: -1 })
    .exec(function (err, data) {
      if (err) {
        res.json({
          success: false,
          message: 'Server Error',
          data: err,
        });
      } else {
        const totalValue = data.reduce((sum, entry) => sum + (entry.Value || 0), 0);

        res.json({
          success: true,
          message: data.length + ' Records Found.',
          data: data,
          lines: data.length,
          totalPoolValue: totalValue,
        });
      }
    });
};

// List all regulators (admin only)
exports.list = function (req, res) {
  const query = { IsDeleted: false };
  const selection = {
    Password: 0, // Don't return password
    __v: 0,
  };

  Regulator.find(query, selection, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: data.length + ' Records Found.',
        data: data,
      });
    }
  });
};

// Get single regulator details (admin only)
exports.getById = function (req, res) {
  const regulatorId = req.params.id || req.body.Id;

  if (!regulatorId) {
    return res.json({
      success: false,
      message: 'Regulator ID is required',
      data: null,
    });
  }

  // Check if the ID matches a known route name (to avoid route conflicts)
  const knownRoutes = ['rng-data', 'prize-pool-data', 'login', 'register', 'update', 'delete', 'list'];
  if (knownRoutes.includes(regulatorId)) {
    // This is a route name, not an ID - let Express try the next route
    return res.status(404).json({
      success: false,
      message: 'Route not found',
      data: null,
    });
  }

  // Validate ObjectId format
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(regulatorId)) {
    return res.json({
      success: false,
      message: 'Invalid Regulator ID format',
      data: null,
    });
  }

  Regulator.findById(regulatorId, { Password: 0, __v: 0 }, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else if (!data) {
      res.json({
        success: false,
        message: 'Regulator not found',
        data: null,
      });
    } else {
      res.json({
        success: true,
        message: 'Regulator found',
        data: data,
      });
    }
  });
};

// Update regulator (admin only)
exports.update = function (req, res) {
  const Id = req.body.Id;
  const Email = req.body.Email;
  const FullName = req.body.FullName;
  const Password = req.body.Password;
  const IsActive = req.body.IsActive;

  if (!Id) {
    return res.json({
      success: false,
      message: 'Regulator ID is required',
      data: null,
    });
  }

  const selection = { _id: Id };
  let updatedData = {};

  if (Email) updatedData.Email = Email;
  if (FullName) updatedData.FullName = FullName;
  if (IsActive !== undefined) updatedData.IsActive = IsActive;

  if (Password && Password !== '') {
    bcrypt.hash(Password, saltRounds, function (err, hash) {
      if (err) {
        return res.json({
          success: false,
          message: 'Error hashing password',
          data: err,
        });
      }
      updatedData.Password = hash;
      Regulator.updateOne(selection, updatedData, function (err, doc) {
        if (err) {
          res.json({
            success: false,
            message: 'Validation Error',
            data: err,
          });
        } else {
          res.json({
            success: true,
            message: 'Successfully Updated!',
            data: doc,
          });
        }
      });
    });
  } else {
    Regulator.updateOne(selection, updatedData, function (err, doc) {
      if (err) {
        res.json({
          success: false,
          message: 'Validation Error',
          data: err,
        });
      } else {
        res.json({
          success: true,
          message: 'Successfully Updated!',
          data: doc,
        });
      }
    });
  }
};

// Delete regulator (soft delete, admin only)
exports.delete = function (req, res) {
  const Id = req.body.Id;

  if (!Id) {
    return res.json({
      success: false,
      message: 'Regulator ID is required',
      data: null,
    });
  }

  const selection = { _id: Id };
  const updatedData = { IsDeleted: true, IsActive: false };

  Regulator.updateOne(selection, updatedData, function (err, doc) {
    if (err) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: 'Successfully Deleted!',
        data: doc,
      });
    }
  });
};

// Get RNG Data (regulator access only)
exports.getRNGData = function (req, res) {
  const query = { IsDeleted: false };
  
  // Date filtering
  if (req.query.startDate && req.query.endDate) {
    const startDate = moment(req.query.startDate, 'DD/MM/YYYY').startOf('day').toDate();
    const endDate = moment(req.query.endDate, 'DD/MM/YYYY').endOf('day').toDate();
    query.DropDate = { $gte: startDate, $lte: endDate };
  }

  RNGData.find(query)
    .populate('MainPrizePoolId', 'Product')
    .sort({ DropDate: -1, DropTime: -1 })
    .exec(function (err, data) {
      if (err) {
        res.json({
          success: false,
          message: 'Server Error',
          data: err,
        });
      } else {
        res.json({
          success: true,
          message: data.length + ' Records Found.',
          data: data,
          lines: data.length,
        });
      }
    });
};

