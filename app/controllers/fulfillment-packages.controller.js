const FulfillmentPackage = require("../models/fulfillment-package.model");

function handleError(res, err, defaultMessage) {
  return res.json({
    success: false,
    message: defaultMessage || "Server Error",
    data: err,
  });
}

exports.list = async function (req, res) {
  try {
    const packages = await FulfillmentPackage.find({ IsDeleted: false }).sort({
      CreationTimestamp: -1,
    });
    return res.json({
      success: true,
      message: `${packages.length} record(s) found.`,
      data: packages,
    });
  } catch (err) {
    return handleError(res, err, "Failed to list fulfillment packages");
  }
};

exports.getById = async function (req, res) {
  try {
    const id = req.params.Id || req.params.id;
    const item = await FulfillmentPackage.findOne({ _id: id, IsDeleted: false });
    if (!item) {
      return res.json({
        success: false,
        message: "Fulfillment package not found",
        data: null,
      });
    }
    return res.json({
      success: true,
      message: "Record found.",
      data: item,
    });
  } catch (err) {
    return handleError(res, err, "Failed to get fulfillment package");
  }
};

exports.add = async function (req, res) {
  try {
    const {
      Name,
      SubscriptionPriceWeekly,
      SecuredPrizesCap,
      ProcessingWindowDays,
      MaxShippedPerWeek,
      InsuranceAmount,
      MinPaidWeeksForBoss,
    } = req.body;

    if (!Name) {
      return res.json({
        success: false,
        message: "Name is required",
        data: null,
      });
    }

    const existing = await FulfillmentPackage.findOne({
      Name: Name.trim(),
      IsDeleted: false,
    });
    if (existing) {
      return res.json({
        success: false,
        message: "A fulfillment package with this name already exists",
        data: null,
      });
    }

    let Image = null;
    if (req.files && req.files.Image && req.files.Image[0] && req.files.Image[0].location) {
      Image = req.files.Image[0].location;
    }

    const pkg = new FulfillmentPackage({
      Name: Name.trim(),
      SubscriptionPriceWeekly:
        SubscriptionPriceWeekly !== undefined
          ? Number(SubscriptionPriceWeekly)
          : 0,
      SecuredPrizesCap: Number(SecuredPrizesCap || 0),
      ProcessingWindowDays: Number(ProcessingWindowDays || 1),
      MaxShippedPerWeek: Number(MaxShippedPerWeek || 0),
      InsuranceAmount: Number(InsuranceAmount || 0),
      MinPaidWeeksForBoss:
        MinPaidWeeksForBoss !== undefined
          ? Number(MinPaidWeeksForBoss)
          : 0,
      Image,
      IsActive: req.body.IsActive === "false" || req.body.IsActive === false ? false : true,
    });

    await pkg.save();
    return res.json({
      success: true,
      message: "Fulfillment package created successfully",
      data: pkg,
    });
  } catch (err) {
    return handleError(res, err, "Failed to create fulfillment package");
  }
};

exports.update = async function (req, res) {
  try {
    const { Id, id } = req.body;
    const packageId = Id || id;

    if (!packageId) {
      return res.json({
        success: false,
        message: "Id is required",
        data: null,
      });
    }

    const updateFields = {};
    [
      "Name",
      "SubscriptionPriceWeekly",
      "SecuredPrizesCap",
      "ProcessingWindowDays",
      "MaxShippedPerWeek",
      "InsuranceAmount",
      "MinPaidWeeksForBoss",
      "IsActive",
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        if (
          [
            "SubscriptionPriceWeekly",
            "SecuredPrizesCap",
            "ProcessingWindowDays",
            "MaxShippedPerWeek",
            "InsuranceAmount",
            "MinPaidWeeksForBoss",
          ].includes(field)
        ) {
          updateFields[field] = Number(req.body[field]);
        } else if (field === "IsActive") {
          updateFields[field] =
            req.body[field] === true || req.body[field] === "true";
        } else {
          updateFields[field] = req.body[field];
        }
      }
    });

    if (req.files && req.files.Image && req.files.Image[0] && req.files.Image[0].location) {
      updateFields.Image = req.files.Image[0].location;
    }

    const updated = await FulfillmentPackage.findOneAndUpdate(
      { _id: packageId, IsDeleted: false },
      updateFields,
      { new: true }
    );

    if (!updated) {
      return res.json({
        success: false,
        message: "Fulfillment package not found",
        data: null,
      });
    }

    return res.json({
      success: true,
      message: "Fulfillment package updated successfully",
      data: updated,
    });
  } catch (err) {
    return handleError(res, err, "Failed to update fulfillment package");
  }
};

exports.delete = async function (req, res) {
  try {
    const id = req.params.Id || req.params.id || req.body.Id || req.body.id;
    if (!id) {
      return res.json({
        success: false,
        message: "Id is required",
        data: null,
      });
    }

    const deleted = await FulfillmentPackage.findOneAndUpdate(
      { _id: id, IsDeleted: false },
      { IsDeleted: true, IsActive: false },
      { new: true }
    );

    if (!deleted) {
      return res.json({
        success: false,
        message: "Fulfillment package not found",
        data: null,
      });
    }

    return res.json({
      success: true,
      message: "Fulfillment package deleted successfully",
      data: deleted,
    });
  } catch (err) {
    return handleError(res, err, "Failed to delete fulfillment package");
  }
};

