const menuCategories = require("../data/menu");
const {
  addBotMessage,
  formatCurrency,
  calculateOrderTotal,
} = require("../utils/helpers");
const {
  getMainMenuOptions,
  getCategoryMenu,
  getMenuItems,
} = require("../utils/messages");

async function processUserInput(req, input) {
  const state = req.session.currentState;

  switch (state) {
    case "main":
      return handleMainMenu(req, input);
    case "categories":
      return handleCategorySelection(req, input);
    case "menu":
      return handleMenuSelection(req, input);
    default:
      req.session.currentState = "main";
      return getMainMenuOptions();
  }
}

function handleMainMenu(req, input) {
  switch (input) {
    case "1":
      req.session.currentState = "categories";
      return getCategoryMenu();
    case "99":
      return handleCheckout(req);
    case "98":
      return handleOrderHistory(req);
    case "97":
      return (
        formatOrder(req.session.currentOrder) + "\n\n" + getMainMenuOptions()
      );
    case "0":
      return handleCancelOrder(req);
    default:
      return "❌ Invalid option.\n" + getMainMenuOptions();
  }
}

// ...define handleCategorySelection, handleMenuSelection, handleCheckout, handleOrderHistory, handleCancelOrder
// (copy them from your original code)

module.exports = { processUserInput };
