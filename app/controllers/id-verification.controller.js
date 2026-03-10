const IdVerification = require("../models/id-verification.model");
const Users = require("../models/users.model");
const mediaUpload = require("../utilities/media_upload");
const moment = require("moment-timezone");

moment.tz.setDefault("Australia/Brisbane");

exports.uploadMiddleware = mediaUpload.fields([
  { name: "IdFront", maxCount: 1 },
  { name: "IdBack", maxCount: 1 },
  { name: "Selfie", maxCount: 1 },
  { name: "AddressDoc", maxCount: 1 },
]);

function getUserIdFromRequest(req) {
  if (req.decoded && (req.decoded.Id || req.decoded.id || req.decoded._id)) {
    return req.decoded.Id || req.decoded.id || req.decoded._id;
  }
  if (req.body && (req.body.userId || req.body.UserId)) {
    return req.body.userId || req.body.UserId;
  }
  if (req.query && (req.query.userId || req.query.UserId)) {
    return req.query.userId || req.query.UserId;
  }
  return null;
}

exports.upload = async function (req, res) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.json({
        success: false,
        message: "userId is required",
        data: null,
      });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
        data: null,
      });
    }

    let record = await IdVerification.findOne({ UserId: userId });
    if (!record) {
      record = new IdVerification({ UserId: userId });
    }

    if (req.files && req.files.IdFront) {
      record.IdFrontUrl = req.files.IdFront[0].location;
    }
    if (req.files && req.files.IdBack) {
      record.IdBackUrl = req.files.IdBack[0].location;
    }
    if (req.files && req.files.Selfie) {
      record.SelfieUrl = req.files.Selfie[0].location;
    }
    if (req.files && req.files.AddressDoc) {
      record.AddressDocUrl = req.files.AddressDoc[0].location;
    }

    if (record.Status === "approved" || record.Status === "not_approved") {
      record.Status = "draft";
      record.SubmittedAt = null;
      record.ReviewedAt = null;
      record.ReviewedBy = null;
    }

    await record.save();

    return res.json({
      success: true,
      message: "ID verification documents uploaded",
      data: record,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: "Failed to upload ID verification documents",
      data: error.message || error,
    });
  }
};

exports.submit = async function (req, res) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.json({
        success: false,
        message: "userId is required",
        data: null,
      });
    }

    const record = await IdVerification.findOne({ UserId: userId });
    if (!record) {
      return res.json({
        success: false,
        message: "No ID verification record found. Please upload documents first.",
        data: null,
      });
    }

    record.Status = "submitted";
    record.SubmittedAt = moment().toDate();
    await record.save();

    return res.json({
      success: true,
      message: "ID verification submitted",
      data: record,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: "Failed to submit ID verification",
      data: error.message || error,
    });
  }
};

exports.getStatus = async function (req, res) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.json({
        success: false,
        message: "userId is required",
        data: null,
      });
    }

    const record = await IdVerification.findOne({ UserId: userId });
    if (!record) {
      return res.json({
        success: true,
        message: "No ID verification record",
        data: { Status: "none" },
      });
    }

    return res.json({
      success: true,
      message: "ID verification status",
      data: {
        Status: record.Status,
        SubmittedAt: record.SubmittedAt,
        ReviewedAt: record.ReviewedAt,
        Notes: record.Notes,
      },
    });
  } catch (error) {
    return res.json({
      success: false,
      message: "Failed to get ID verification status",
      data: error.message || error,
    });
  }
};

exports.list = async function (req, res) {
  try {
    const status = req.query.status;
    const query = {};
    if (status) {
      query.Status = status;
    }

    const items = await IdVerification.find(query)
      .populate("UserId", "FullName Email Address")
      .sort({ CreationTimestamp: -1 });

    return res.json({
      success: true,
      message: `${items.length} record(s)`,
      data: items,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: "Failed to list ID verifications",
      data: error.message || error,
    });
  }
};

exports.getOne = async function (req, res) {
  try {
    const id = req.params.id;
    if (!id) {
      return res.json({
        success: false,
        message: "id is required",
        data: null,
      });
    }

    const record = await IdVerification.findById(id).populate(
      "UserId",
      "FullName Email Address"
    );
    if (!record) {
      return res.json({
        success: false,
        message: "ID verification not found",
        data: null,
      });
    }

    return res.json({
      success: true,
      message: "ID verification record",
      data: record,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: "Failed to get ID verification record",
      data: error.message || error,
    });
  }
};

exports.decision = async function (req, res) {
  try {
    const id = req.params.id;
    const { decision, reviewerUserId, notes } = req.body;

    if (!id || !decision) {
      return res.json({
        success: false,
        message: "id and decision are required",
        data: null,
      });
    }

    if (!["approved", "not_approved"].includes(decision)) {
      return res.json({
        success: false,
        message: "decision must be 'approved' or 'not_approved'",
        data: null,
      });
    }

    const record = await IdVerification.findById(id);
    if (!record) {
      return res.json({
        success: false,
        message: "ID verification not found",
        data: null,
      });
    }

    record.Status = decision;
    record.ReviewedAt = moment().toDate();
    record.ReviewedBy = reviewerUserId || null;
    if (notes) {
      record.Notes = notes;
    }
    await record.save();

    // Optional hook: could send email or push notification here.

    return res.json({
      success: true,
      message: "Decision saved",
      data: record,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: "Failed to save decision",
      data: error.message || error,
    });
  }
};

