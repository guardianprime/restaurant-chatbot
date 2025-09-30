const express = require("express");
const router = express.Router();

const initializeSession = require("../middleware/sessionInit");
const { addUserMessage, addBotMessage } = require("../utils/helpers");
const { processUserInput } = require("../services/chatbotService");
const { getMainMenuOptions } = require("../utils/messages");
const { PAYSTACK_PUBLIC_KEY } = require("../config/paystack");

router.get("/", (req, res) => {
  initializeSession(req);

  if (req.session.chatHistory.length === 0) {
    addBotMessage(req, "Welcome to Tasty Bites Restaurant!");
    addBotMessage(req, getMainMenuOptions());
  }

  res.render("index", {
    chatHistory: req.session.chatHistory,
    paystackPublicKey: PAYSTACK_PUBLIC_KEY,
  });
});

router.post("/chat", async (req, res) => {
  initializeSession(req);
  const userInput = req.body.message?.trim();
  if (!userInput) return res.json({ success: false, message: "Invalid input" });

  addUserMessage(req, userInput);
  const response = await processUserInput(req, userInput);
  addBotMessage(req, response);

  res.json({ success: true, chatHistory: req.session.chatHistory });
});

module.exports = router;
