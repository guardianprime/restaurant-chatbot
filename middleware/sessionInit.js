const crypto = require("crypto");

function initializeSession(req) {
  if (!req.session.chatHistory) req.session.chatHistory = [];
  if (!req.session.currentOrder) req.session.currentOrder = [];
  if (!req.session.orderHistory) req.session.orderHistory = [];
  if (!req.session.currentState) req.session.currentState = "main";
  if (!req.session.deviceId)
    req.session.deviceId = "device_" + crypto.randomBytes(8).toString("hex");
}

module.exports = initializeSession;
