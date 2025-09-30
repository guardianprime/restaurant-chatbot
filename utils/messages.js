const { formatCurrency } = require("./helpers");
const menuCategories = require("../data/menu");

function getMainMenuOptions() {
  return `
📋 Main Menu:
1. Place an order
99. Checkout order
98. See order history
97. See current order
0. Cancel order`;
}

function getCategoryMenu() {
  return `
🍽️ Food Categories:
1. Appetizers
2. Main Courses
3. Beverages
0. Back to main menu`;
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
  menu += `0 Back to categories`;
  return menu;
}

module.exports = { getMainMenuOptions, getCategoryMenu, getMenuItems };
