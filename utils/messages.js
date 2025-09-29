const { formatCurrency } = require("./helpers");
const menuCategories = require("../data/menu");

function getMainMenuOptions() {
  return `
📋 Main Menu:
1️⃣ Place an order
9️⃣9️⃣ Checkout order
9️⃣8️⃣ See order history
9️⃣7️⃣ See current order
0️⃣ Cancel order`;
}

function getCategoryMenu() {
  return `
🍽️ Food Categories:
1️⃣ Appetizers
2️⃣ Main Courses
3️⃣ Beverages
0️⃣ Back to main menu`;
}

function getMenuItems(category) {
  const categoryData = menuCategories[category];
  if (!categoryData) return null;

  let menu = `\n🍴 ${categoryData.name}:\n\n`;
  categoryData.items.forEach((item) => {
    menu += `${item.id}️⃣ ${item.name} - ${formatCurrency(item.price)}\n   ${
      item.description
    }\n\n`;
  });
  menu += `0️⃣ Back to categories`;
  return menu;
}

module.exports = { getMainMenuOptions, getCategoryMenu, getMenuItems };
