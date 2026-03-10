const UserPrize = require("../models/user-prize.model");
const Prizes = require("../models/prizes.model");
const Users = require("../models/users.model");
const FulfillmentPackage = require("../models/fulfillment-package.model");
const IdVerification = require("../models/id-verification.model");
const moment = require("moment-timezone");

moment.tz.setDefault("Australia/Brisbane");

function getUserIdFromToken(req) {
  // Prefer JWT payload (set by Token.checkToken) and only fall back
  // to body fields for backwards compatibility if needed.
  if (req.decoded && (req.decoded.Id || req.decoded.id || req.decoded._id)) {
    return req.decoded.Id || req.decoded.id || req.decoded._id;
  }
  if (req.user && (req.user.Id || req.user.id || req.user._id)) {
    return req.user.Id || req.user.id || req.user._id;
  }
  if (req.body && (req.body.UserId || req.body.userId)) {
    return req.body.UserId || req.body.userId;
  }
  return null;
}

function handleError(res, err, defaultMessage) {
  return res.json({
    success: false,
    message: defaultMessage || "Server Error",
    data: err,
  });
}

async function getUserAndPackage(userId) {
  const user = await Users.findById(userId);
  if (!user) {
    return { error: "User not found" };
  }

  if (!user.FulfillmentPackageId) {
    return { error: "User does not have a fulfillment package assigned" };
  }

  const pkg = await FulfillmentPackage.findOne({
    _id: user.FulfillmentPackageId,
    IsDeleted: false,
  });
  if (!pkg) {
    return { error: "User's fulfillment package not found" };
  }
  return { user, pkg };
}

exports.listActive = async function (req, res) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.json({
        success: false,
        message: "UserId is required",
        data: null,
      });
    }
    const items = await UserPrize.find({
      UserId: userId,
      Status: "active",
      IsDeleted: false,
    })
      .populate("PrizeId")
      .sort({ CreationTimestamp: -1 });

    return res.json({
      success: true,
      message: `${items.length} active prize(s)`,
      data: items,
    });
  } catch (err) {
    return handleError(res, err, "Failed to list active prizes");
  }
};

exports.listSecured = async function (req, res) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.json({
        success: false,
        message: "UserId is required",
        data: null,
      });
    }
    const items = await UserPrize.find({
      UserId: userId,
      Status: { $in: ["secured", "waiting", "processing", "shipped"] },
      IsDeleted: false,
    })
      .populate("PrizeId")
      .sort({ CreationTimestamp: -1 });

    return res.json({
      success: true,
      message: `${items.length} secured prize(s)`,
      data: items,
    });
  } catch (err) {
    return handleError(res, err, "Failed to list secured prizes");
  }
};

exports.moveToSecured = async function (req, res) {
  try {
    const userId = getUserIdFromToken(req);
    const { userPrizeId, prizeId } = req.body;

    if (!userId) {
      return res.json({
        success: false,
        message: "UserId is required",
        data: null,
      });
    }
    if (!userPrizeId && !prizeId) {
      return res.json({
        success: false,
        message: "userPrizeId or prizeId is required",
        data: null,
      });
    }

    const { user, pkg, error } = await getUserAndPackage(userId);
    if (error) {
      return res.json({
        success: false,
        message: error,
        data: null,
      });
    }

    const idVerification = await IdVerification.findOne({
      UserId: userId,
      Status: "approved",
    });
    if (!idVerification) {
      return res.status(403).json({
        success: false,
        message: "ID verification must be approved before securing a prize. Please complete and submit ID verification first.",
        code: "ID_VERIFICATION_REQUIRED",
      });
    }

    let userPrize;
    if (userPrizeId) {
      userPrize = await UserPrize.findOne({
        _id: userPrizeId,
        UserId: userId,
        IsDeleted: false,
      }).populate("PrizeId");
    } else {
      userPrize = await UserPrize.findOne({
        UserId: userId,
        PrizeId: prizeId,
        IsDeleted: false,
      }).populate("PrizeId");
    }

    if (!userPrize) {
      return res.json({
        success: false,
        message: "User prize not found",
        data: null,
      });
    }

    if (userPrize.Status !== "active") {
      return res.json({
        success: false,
        message: `Prize is not in active state (current: ${userPrize.Status})`,
        data: null,
      });
    }

    const securedCount = await UserPrize.countDocuments({
      UserId: userId,
      Status: { $in: ["secured", "waiting", "processing"] },
      IsDeleted: false,
    });
    if (
      typeof pkg.SecuredPrizesCap === "number" &&
      pkg.SecuredPrizesCap > 0 &&
      securedCount >= pkg.SecuredPrizesCap
    ) {
      return res.json({
        success: false,
        message: "Prize limit reached for your fulfillment plan",
        code: "PRIZE_LIMIT_REACHED",
        data: {
          cap: pkg.SecuredPrizesCap,
          current: securedCount,
        },
      });
    }

    const prizeDoc =
      userPrize.PrizeId &&
      typeof userPrize.PrizeId.PrizeValue === "number"
        ? userPrize.PrizeId
        : await Prizes.findById(userPrize.PrizeId);

    if (!prizeDoc) {
      return res.json({
        success: false,
        message: "Underlying prize not found",
        data: null,
      });
    }

    if (
      typeof pkg.InsuranceAmount === "number" &&
      pkg.InsuranceAmount > 0 &&
      prizeDoc.PrizeValue > pkg.InsuranceAmount
    ) {
      return res.json({
        success: false,
        message:
          "Insurance limit reached for this prize under your current plan",
        code: "INSURANCE_LIMIT_REACHED",
        data: {
          insuranceMax: pkg.InsuranceAmount,
          prizeValue: prizeDoc.PrizeValue,
        },
      });
    }

    const now = moment();
    userPrize.Status = "secured";
    userPrize.SecuredAt = now.toDate();
    userPrize.ProcessingStartsAt = now
      .clone()
      .add(pkg.ProcessingWindowDays || 1, "days")
      .toDate();
    await userPrize.save();

    return res.json({
      success: true,
      message: "Prize moved to secured successfully",
      data: userPrize,
    });
  } catch (err) {
    return handleError(res, err, "Failed to move prize to secured");
  }
};

exports.processPrize = async function (req, res) {
  try {
    const userId = getUserIdFromToken(req);
    const { userPrizeId } = req.body;

    if (!userId || !userPrizeId) {
      return res.json({
        success: false,
        message: "UserId and userPrizeId are required",
        data: null,
      });
    }

    const { pkg, error } = await getUserAndPackage(userId);
    if (error) {
      return res.json({
        success: false,
        message: error,
        data: null,
      });
    }

    const target = await UserPrize.findOne({
      _id: userPrizeId,
      UserId: userId,
      Status: { $in: ["secured", "waiting"] },
      IsDeleted: false,
    });
    if (!target) {
      return res.json({
        success: false,
        message: "User prize not found or not eligible for processing",
        data: null,
      });
    }

    const now = moment();
    const weekAgo = now.clone().subtract(7, "days").toDate();

    const recentProcessingCount = await UserPrize.countDocuments({
      UserId: userId,
      Status: "processing",
      ProcessingStartsAt: { $gte: weekAgo },
      IsDeleted: false,
    });

    if (
      typeof pkg.MaxShippedPerWeek === "number" &&
      pkg.MaxShippedPerWeek > 0 &&
      recentProcessingCount >= pkg.MaxShippedPerWeek
    ) {
      return res.json({
        success: false,
        message:
          "Weekly processing limit reached for your fulfillment plan. Please wait before processing another prize.",
        code: "PROCESSING_LIMIT_REACHED",
        data: {
          maxPerWeek: pkg.MaxShippedPerWeek,
          current: recentProcessingCount,
        },
      });
    }

    await UserPrize.updateMany(
      {
        UserId: userId,
        Status: "processing",
        IsDeleted: false,
      },
      {
        $set: {
          Status: "waiting",
        },
      }
    );

    target.Status = "processing";
    target.ProcessingStartsAt = now.toDate();
    await target.save();

    return res.json({
      success: true,
      message: "Prize moved to processing queue",
      data: target,
    });
  } catch (err) {
    return handleError(res, err, "Failed to start processing for prize");
  }
};

exports.getTracking = async function (req, res) {
  try {
    const userId = getUserIdFromToken(req);
    const id = req.params.id;
    if (!userId || !id) {
      return res.json({
        success: false,
        message: "UserId and id are required",
        data: null,
      });
    }

    const item = await UserPrize.findOne({
      _id: id,
      UserId: userId,
      IsDeleted: false,
    });
    if (!item) {
      return res.json({
        success: false,
        message: "User prize not found",
        data: null,
      });
    }

    return res.json({
      success: true,
      message: "Tracking information",
      data: {
        Status: item.Status,
        TrackingNumber: item.TrackingNumber,
        TrackingHistory: item.TrackingHistory,
        ShopifyOrderId: item.ShopifyOrderId,
      },
    });
  } catch (err) {
    return handleError(res, err, "Failed to get tracking information");
  }
};

