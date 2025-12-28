/**
 * Input Validation Middleware
 * Validates request data before it reaches controllers
 */

// Validate required fields
exports.validateRequired = function (fields) {
  return function (req, res, next) {
    const missing = [];
    
    fields.forEach(field => {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      return res.json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
        data: null
      });
    }

    next();
  };
};

// Validate email format
exports.validateEmail = function (field = 'Email') {
  return function (req, res, next) {
    if (req.body[field]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body[field])) {
        return res.json({
          success: false,
          message: `Invalid email format for field: ${field}`,
          data: null
        });
      }
    }
    next();
  };
};

// Validate date format (DD/MM/YYYY)
exports.validateDate = function (field = 'Date') {
  return function (req, res, next) {
    if (req.body[field] || req.query[field]) {
      const dateValue = req.body[field] || req.query[field];
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      
      if (!dateRegex.test(dateValue)) {
        return res.json({
          success: false,
          message: `Invalid date format for ${field}. Expected format: DD/MM/YYYY`,
          data: null
        });
      }

      // Validate actual date
      const [day, month, year] = dateValue.split('/');
      const date = new Date(year, month - 1, day);
      
      if (date.getDate() != day || date.getMonth() != month - 1 || date.getFullYear() != year) {
        return res.json({
          success: false,
          message: `Invalid date value for ${field}`,
          data: null
        });
      }
    }
    next();
  };
};

// Validate date range
exports.validateDateRange = function (startField = 'startDate', endField = 'endDate') {
  return function (req, res, next) {
    const startDate = req.query[startField] || req.body[startField];
    const endDate = req.query[endField] || req.body[endField];

    if (startDate && endDate) {
      const moment = require('moment');
      const start = moment(startDate, 'DD/MM/YYYY');
      const end = moment(endDate, 'DD/MM/YYYY');

      if (!start.isValid() || !end.isValid()) {
        return res.json({
          success: false,
          message: 'Invalid date format. Expected: DD/MM/YYYY',
          data: null
        });
      }

      if (start.isAfter(end)) {
        return res.json({
          success: false,
          message: 'Start date must be before or equal to end date',
          data: null
        });
      }
    }
    next();
  };
};

// Validate number range
exports.validateNumberRange = function (field, min, max) {
  return function (req, res, next) {
    if (req.body[field] !== undefined) {
      const value = parseFloat(req.body[field]);
      
      if (isNaN(value)) {
        return res.json({
          success: false,
          message: `${field} must be a valid number`,
          data: null
        });
      }

      if (min !== undefined && value < min) {
        return res.json({
          success: false,
          message: `${field} must be at least ${min}`,
          data: null
        });
      }

      if (max !== undefined && value > max) {
        return res.json({
          success: false,
          message: `${field} must be at most ${max}`,
          data: null
        });
      }
    }
    next();
  };
};

// Validate MongoDB ObjectId
exports.validateObjectId = function (field = 'Id') {
  return function (req, res, next) {
    if (req.body[field] || req.params[field] || req.query[field]) {
      const mongoose = require('mongoose');
      const id = req.body[field] || req.params[field] || req.query[field];
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.json({
          success: false,
          message: `Invalid ${field} format`,
          data: null
        });
      }
    }
    next();
  };
};

// Validate enum values
exports.validateEnum = function (field, allowedValues) {
  return function (req, res, next) {
    if (req.body[field] !== undefined) {
      if (!allowedValues.includes(req.body[field])) {
        return res.json({
          success: false,
          message: `${field} must be one of: ${allowedValues.join(', ')}`,
          data: null
        });
      }
    }
    next();
  };
};

// Validate coordinates (latitude/longitude)
exports.validateCoordinates = function (latField = 'latitude', lngField = 'longitude') {
  return function (req, res, next) {
    if (req.body[latField] !== undefined || req.body[lngField] !== undefined) {
      const lat = parseFloat(req.body[latField]);
      const lng = parseFloat(req.body[lngField]);

      if (isNaN(lat) || isNaN(lng)) {
        return res.json({
          success: false,
          message: `${latField} and ${lngField} must be valid numbers`,
          data: null
        });
      }

      if (lat < -90 || lat > 90) {
        return res.json({
          success: false,
          message: `${latField} must be between -90 and 90`,
          data: null
        });
      }

      if (lng < -180 || lng > 180) {
        return res.json({
          success: false,
          message: `${lngField} must be between -180 and 180`,
          data: null
        });
      }
    }
    next();
  };
};

// Validate string length
exports.validateStringLength = function (field, minLength, maxLength) {
  return function (req, res, next) {
    if (req.body[field] !== undefined) {
      const value = String(req.body[field]);
      
      if (minLength !== undefined && value.length < minLength) {
        return res.json({
          success: false,
          message: `${field} must be at least ${minLength} characters`,
          data: null
        });
      }

      if (maxLength !== undefined && value.length > maxLength) {
        return res.json({
          success: false,
          message: `${field} must be at most ${maxLength} characters`,
          data: null
        });
      }
    }
    next();
  };
};

// Combined validation for prize claim
exports.validatePrizeClaim = function (req, res, next) {
  const mongoose = require('mongoose');
  
  if (!req.body.prizeId) {
    return res.json({
      success: false,
      message: 'Prize ID is required',
      data: null
    });
  }

  if (!req.body.userId) {
    return res.json({
      success: false,
      message: 'User ID is required',
      data: null
    });
  }

  if (!mongoose.Types.ObjectId.isValid(req.body.prizeId)) {
    return res.json({
      success: false,
      message: 'Invalid Prize ID format',
      data: null
    });
  }

  if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
    return res.json({
      success: false,
      message: 'Invalid User ID format',
      data: null
    });
  }

  next();
};

// Combined validation for main prize pool
exports.validateMainPrizePool = function (req, res, next) {
  if (!req.body.Product) {
    return res.json({
      success: false,
      message: 'Product name is required',
      data: null
    });
  }

  if (req.body.Rarity !== undefined) {
    const rarity = parseFloat(req.body.Rarity);
    if (isNaN(rarity) || rarity < 1) {
      return res.json({
        success: false,
        message: 'Rarity must be a number >= 1',
        data: null
      });
    }
  }

  if (req.body.MaxPerDay !== undefined) {
    const maxPerDay = parseFloat(req.body.MaxPerDay);
    if (isNaN(maxPerDay) || maxPerDay < 1) {
      return res.json({
        success: false,
        message: 'Max Per Day must be a number >= 1',
        data: null
      });
    }
  }

  if (req.body.PrizeValue !== undefined) {
    const value = parseFloat(req.body.PrizeValue);
    if (isNaN(value) || value < 0) {
      return res.json({
        success: false,
        message: 'Prize Value must be a number >= 0',
        data: null
      });
    }
  }

  next();
};

