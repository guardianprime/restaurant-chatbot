const express = require("express");
const axios = require("axios");
const router = express.Router();

const initializeSession = require("../middleware/sessionInit");
const { calculateOrderTotal, addBotMessage } = require("../utils/helpers");
const { getMainMenuOptions } = require("../utils/messages");
const { PAYSTACK_SECRET_KEY } = require("../config/paystack");

router.post("/initiate-payment", async (req, res) => {
  initializeSession(req);

  if (req.session.currentOrder.length === 0) {
    return res.json({ success: false, message: "No items in cart" });
  }

  const total = calculateOrderTotal(req.session.currentOrder);
  const email = req.body.email || "customer@example.com";

  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: total * 100,
        callback_url: `${req.protocol}://${req.get("host")}/payment/callback`,
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    res.json({
      success: true,
      authorization_url: response.data.data.authorization_url,
    });
  } catch (error) {
    console.error(
      "Payment initialization error:",
      error.response?.data || error.message
    );
    res.json({ success: false, message: "Payment initialization failed" });
  }
});

router.get("/payment/callback", async (req, res) => {
  const reference = req.query.reference;

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    if (response.data.data.status === "success") {
      req.session.orderHistory.push({
        id: Date.now(),
        items: [...req.session.currentOrder],
        total: calculateOrderTotal(req.session.currentOrder),
        status: "Paid",
        date: new Date(),
        reference,
      });

      req.session.currentOrder = [];
      req.session.currentState = "main";

      addBotMessage(req, "✅ Payment successful! Your order has been placed.");
      addBotMessage(req, getMainMenuOptions());

      res.redirect("/");
    } else {
      addBotMessage(req, "❌ Payment failed. Please try again.");
      res.redirect("/");
    }
  } catch (error) {
    console.error(
      "Payment verification error:",
      error.response?.data || error.message
    );
    addBotMessage(req, "❌ Payment verification failed. Contact support.");
    res.redirect("/");
  }
});

module.exports = router;
