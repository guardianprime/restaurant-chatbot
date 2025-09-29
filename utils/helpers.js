function addBotMessage(req, message) {
  req.session.chatHistory.push({
    id: Date.now(),
    text: message,
    isBot: true,
    timestamp: new Date(),
  });
}

function addUserMessage(req, message) {
  req.session.chatHistory.push({
    id: Date.now(),
    text: message,
    isBot: false,
    timestamp: new Date(),
  });
}

function formatCurrency(amount) {
  return `₦${amount.toLocaleString()}`;
}

function calculateOrderTotal(order) {
  return order.reduce((total, item) => total + item.price * item.quantity, 0);
}

module.exports = {
  addBotMessage,
  addUserMessage,
  formatCurrency,
  calculateOrderTotal,
};
