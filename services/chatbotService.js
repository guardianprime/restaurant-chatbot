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

const handleCategorySelection = (req, input) => {
  switch (input) {
    case "1":
      req.session.currentState = "menu";
      req.session.selectedCategory = "appetizers";
      return getMenuItems("appetizers");

    case "2":
      req.session.currentState = "menu";
      req.session.selectedCategory = "mains";
      return getMenuItems("mains");

    case "3":
      req.session.currentState = "menu";
      req.session.selectedCategory = "drinks";
      return getMenuItems("drinks");

    case "0":
      req.session.currentState = "main";
      return getMainMenuOptions();

    default:
      return (
        "❌ Invalid option. Please select from the available categories:\n\n" +
        getCategoryMenu()
      );
  }
};

const handleMenuSelection = (req, input) => {
  if (input === "0") {
    req.session.currentState = "categories";
    return getCategoryMenu();
  }

  // Find item by ID
  let selectedItem = null;
  Object.values(menuCategories).forEach((category) => {
    const item = category.items.find((item) => item.id.toString() === input);
    if (item) selectedItem = item;
  });

  if (!selectedItem) {
    return (
      "❌ Invalid item selection. Please choose from the available items:\n\n" +
      getMenuItems(req.session.selectedCategory)
    );
  }

  // Add to current order
  const existingItem = req.session.currentOrder.find(
    (item) => item.id === selectedItem.id
  );
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    req.session.currentOrder.push({
      ...selectedItem,
      quantity: 1,
    });
  }

  return (
    `✅ Added ${selectedItem.name} to your cart!\n\n` +
    formatOrder(req.session.currentOrder) +
    "\n\n🔄 Continue shopping or checkout:\n" +
    "99 - Checkout\n" +
    "0 - Back to categories\n" +
    "97 - View current order"
  );
};

const handleCheckout = (req) => {
  const total = calculateOrderTotal(req.session.currentOrder);

  return (
    `🛒 Order Summary:\n\n${formatOrder(req.session.currentOrder)}\n\n` +
    `📅 Scheduling Options:\n` +
    `1️⃣ Order now (immediate)\n` +
    `2️⃣ Schedule for later\n\n` +
    `💳 Payment Options:\n` +
    `3️⃣ Pay with Paystack\n` +
    `0️⃣ Back to main menu\n\n` +
    `Type your choice:`
  );
};

const handleScheduling = (req, input) => {
  // Simple scheduling implementation
  switch (input) {
    case "1":
      req.session.scheduledTime = "immediate";
      return (
        "✅ Order scheduled for immediate preparation.\n\n" +
        "💳 Please choose payment method:\n" +
        "1️⃣ Pay with Paystack\n" +
        "0️⃣ Back to main menu"
      );

    case "2":
      req.session.scheduledTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      return (
        "⏰ Order scheduled for 1 hour from now.\n\n" +
        "💳 Please choose payment method:\n" +
        "1 Pay with Paystack\n" +
        "0 Back to main menu"
      );

    default:
      return "❌ Invalid option. Please select 1 for immediate or 2 for scheduled delivery.";
  }
};

const handleOrderHistory = (req) => {
  if (req.session.orderHistory.length === 0) {
    return "📋 No previous orders found.\n\n" + getMainMenuOptions();
  }

  let history = "📋 Order History:\n\n";
  req.session.orderHistory.forEach((order, index) => {
    history += `Order #${index + 1} - ${new Date(
      order.date
    ).toLocaleDateString()}\n`;
    history += `Status: ${order.status}\n`;
    history += `Total: ${formatCurrency(order.total)}\n`;
    order.items.forEach((item) => {
      history += `  • ${item.name} x${item.quantity}\n`;
    });
    history += "\n";
  });

  return history + getMainMenuOptions();
};

const handleCancelOrder = (req) => {
  if (req.session.currentOrder.length === 0) {
    return "❌ No order to cancel.\n\n" + getMainMenuOptions();
  }

  req.session.currentOrder = [];
  req.session.currentState = "main";
  return "✅ Order cancelled successfully.\n\n" + getMainMenuOptions();
};

const formatOrder = (order) => {
  if (order.length === 0) return "Your cart is empty.";

  let orderText = "🛒 Your Current Order:\n\n";
  order.forEach((item, index) => {
    orderText += `${index + 1}. ${item.name} x${item.quantity}\n`;
    orderText += `   ${formatCurrency(item.price)} each = ${formatCurrency(
      item.price * item.quantity
    )}\n\n`;
  });

  const total = calculateOrderTotal(order);
  orderText += `💰 Total: ${formatCurrency(total)}`;
  return orderText;
};

module.exports = { processUserInput };
