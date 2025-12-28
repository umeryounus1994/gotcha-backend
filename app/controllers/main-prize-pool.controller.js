const MainPrizePool = require('../models/main-prize-pool.model');

// List all prizes in the main prize pool
exports.list = function (req, res) {
  const query = { IsDeleted: false };
  const selection = { __v: 0 };

  MainPrizePool.find(query, selection, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      // Calculate total prize pool value
      const totalValue = data.reduce((sum, prize) => sum + (prize.PrizeValue || 0), 0);

      res.json({
        success: true,
        message: data.length + ' Records Found.',
        data: data,
        totalPrizePoolValue: totalValue,
      });
    }
  });
};

// Add new prize to main prize pool
exports.add = function (req, res) {
  const prizeForm = req.body;

  const prize = new MainPrizePool();
  prize.Product = prizeForm.Product;
  prize.SKUPhoto = prizeForm.SKUPhoto || '';
  prize.Rarity = prizeForm.Rarity || 1;
  prize.MaxPerDay = prizeForm.MaxPerDay || 1;
  prize.PrizeValue = prizeForm.PrizeValue || 0;

  prize.save(function (err, result) {
    if (err) {
      res.json({
        success: false,
        message: 'Error in Connecting to DB',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: 'Successfully Added!',
        data: result,
      });
    }
  });
};

// Update prize in main prize pool
exports.update = function (req, res) {
  const Id = req.body.Id;
  const prizeForm = req.body;

  const selection = { _id: Id };
  const updatedData = {
    Product: prizeForm.Product,
    SKUPhoto: prizeForm.SKUPhoto,
    Rarity: prizeForm.Rarity,
    MaxPerDay: prizeForm.MaxPerDay,
    PrizeValue: prizeForm.PrizeValue,
  };

  MainPrizePool.updateOne(selection, updatedData, function (err, doc) {
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
};

// Delete prize from main prize pool (soft delete)
exports.delete = function (req, res) {
  const Id = req.body.Id;
  const selection = { _id: Id };
  const updatedData = { IsDeleted: true, IsActive: false };

  MainPrizePool.updateOne(selection, updatedData, function (err, doc) {
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

// Get total prize pool value
exports.getTotalValue = function (req, res) {
  const query = { IsDeleted: false, IsActive: true };

  MainPrizePool.find(query, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      const totalValue = data.reduce((sum, prize) => sum + (prize.PrizeValue || 0), 0);
      res.json({
        success: true,
        message: 'Total Prize Pool Value',
        data: { totalValue },
      });
    }
  });
};

