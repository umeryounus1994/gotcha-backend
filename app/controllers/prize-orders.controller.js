const UserPrize = require("../models/user-prize.model");
const Users = require("../models/users.model");
const fetch = require("node-fetch");

exports.list = async function (req, res) {
  try {
    const search = (req.query.search || "").toString().trim().toLowerCase();

    const match = {
      Status: { $in: ["processing", "waiting"] },
      IsDeleted: false,
    };

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "UserId",
          foreignField: "_id",
          as: "User",
        },
      },
      { $unwind: "$User" },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "User.FullName": { $regex: search, $options: "i" } },
            { "User.Email": { $regex: search, $options: "i" } },
            { "User.Address": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    pipeline.push({
      $sort: { CreationTimestamp: -1 },
    });

    const orders = await UserPrize.aggregate(pipeline);

    return res.json({
      success: true,
      message: `${orders.length} prize order(s)`,
      data: orders,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: "Failed to list prize orders",
      data: error.message || error,
    });
  }
};

// Create Shopify order for a prize (uses env SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN)
exports.sendToShopify = async function (req, res) {
  try {
    const id = req.params.id;
    if (!id) {
      return res.json({
        success: false,
        message: "id is required",
        data: null,
      });
    }

    const userPrize = await UserPrize.findOne({
      _id: id,
      IsDeleted: false,
    }).populate("UserId", "FullName Email Address");

    if (!userPrize) {
      return res.json({
        success: false,
        message: "Prize order not found",
        data: null,
      });
    }

    if (userPrize.ShopifyOrderId) {
      return res.json({
        success: true,
        message: "Order already sent to Shopify",
        data: userPrize,
      });
    }

    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!storeDomain || !accessToken) {
      return res.status(500).json({
        success: false,
        message:
          "Shopify configuration is missing. Please set SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN.",
        data: null,
      });
    }

    const user = userPrize.UserId;

    // Basic Shopify order payload – you can extend with real line items/SKUs
    const orderPayload = {
      order: {
        email: user.Email,
        customer: {
          first_name: user.FullName,
          email: user.Email,
        },
        shipping_address: {
          name: user.FullName,
          address1: user.Address || "",
        },
        line_items: [
          {
            title: "Gotcha Prize",
            quantity: 1,
          },
        ],
      },
    };

    const response = await fetch(
      `https://${storeDomain}/admin/api/2023-10/orders.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify(orderPayload),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        success: false,
        message: "Failed to create Shopify order",
        data: text,
      });
    }

    const data = await response.json();
    const shopifyOrder = data && data.order ? data.order : null;
    if (!shopifyOrder) {
      return res.status(500).json({
        success: false,
        message: "Unexpected Shopify response",
        data,
      });
    }

    userPrize.ShopifyOrderId = String(shopifyOrder.id);
    userPrize.Status = "processing";
    await userPrize.save();

    return res.json({
      success: true,
      message: "Prize order sent to Shopify",
      data: userPrize,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: "Failed to send prize order to Shopify",
      data: error.message || error,
    });
  }
};

