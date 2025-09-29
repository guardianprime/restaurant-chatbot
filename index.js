// server.js
const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session configuration
app.use(
  session({
    secret: "restaurant-chatbot-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// Restaurant menu data
const menuCategories = {
  appetizers: {
    name: "Appetizers",
    items: [
      {
        id: 1,
        name: "Spring Rolls",
        price: 1200,
        description: "Crispy vegetable spring rolls",
      },
      {
        id: 2,
        name: "Chicken Wings",
        price: 1800,
        description: "Spicy buffalo wings",
      },
      {
        id: 3,
        name: "Nachos",
        price: 1500,
        description: "Loaded cheese nachos",
      },
    ],
  },
  mains: {
    name: "Main Courses",
    items: [
      {
        id: 4,
        name: "Jollof Rice",
        price: 2500,
        description: "Traditional Nigerian jollof rice",
      },
      {
        id: 5,
        name: "Fried Rice",
        price: 2300,
        description: "Chinese-style fried rice",
      },
      {
        id: 6,
        name: "Grilled Chicken",
        price: 3200,
        description: "Herb-marinated grilled chicken",
      },
      {
        id: 7,
        name: "Fish & Chips",
        price: 2800,
        description: "Beer-battered fish with fries",
      },
    ],
  },
  drinks: {
    name: "Beverages",
    items: [
      {
        id: 8,
        name: "Coca Cola",
        price: 500,
        description: "Chilled soft drink",
      },
      {
        id: 9,
        name: "Fresh Juice",
        price: 800,
        description: "Freshly squeezed orange juice",
      },
      { id: 10, name: "Water", price: 300, description: "Bottled water" },
    ],
  },
};

// Paystack configuration
const PAYSTACK_SECRET_KEY = "sk_test_your_paystack_secret_key_here"; // Replace with your test secret key
const PAYSTACK_PUBLIC_KEY = "pk_test_your_paystack_public_key_here"; // Replace with your test public key

// Initialize session data
const initializeSession = (req) => {
  if (!req.session.chatHistory) {
    req.session.chatHistory = [];
  }
  if (!req.session.currentOrder) {
    req.session.currentOrder = [];
  }
  if (!req.session.orderHistory) {
    req.session.orderHistory = [];
  }
  if (!req.session.currentState) {
    req.session.currentState = "main";
  }
  if (!req.session.deviceId) {
    req.session.deviceId = "device_" + crypto.randomBytes(8).toString("hex");
  }
};

// Helper functions
const addBotMessage = (req, message) => {
  req.session.chatHistory.push({
    id: Date.now(),
    text: message,
    isBot: true,
    timestamp: new Date(),
  });
};

const addUserMessage = (req, message) => {
  req.session.chatHistory.push({
    id: Date.now(),
    text: message,
    isBot: false,
    timestamp: new Date(),
  });
};

const formatCurrency = (amount) => {
  return `₦${amount.toLocaleString()}`;
};

const getMainMenuOptions = () => {
  return `
📋 Main Menu - Please select an option:
1️⃣ Place an order
9️⃣9️⃣ Checkout order
9️⃣8️⃣ See order history
9️⃣7️⃣ See current order
0️⃣ Cancel order

Type the number of your choice:`;
};

const getCategoryMenu = () => {
  return `
🍽️ Food Categories - Please select:
1️⃣ Appetizers
2️⃣ Main Courses
3️⃣ Beverages
0️⃣ Back to main menu

Type the number of your choice:`;
};

const getMenuItems = (category) => {
  const categoryData = menuCategories[category];
  if (!categoryData) return null;

  let menu = `\n🍴 ${categoryData.name}:\n\n`;
  categoryData.items.forEach((item) => {
    menu += `${item.id}️⃣ ${item.name} - ${formatCurrency(item.price)}\n`;
    menu += `   ${item.description}\n\n`;
  });
  menu += `0️⃣ Back to categories\n\nType the item number to add to cart:`;
  return menu;
};

const calculateOrderTotal = (order) => {
  return order.reduce((total, item) => total + item.price * item.quantity, 0);
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

// Routes
app.get("/", (req, res) => {
  initializeSession(req);

  // Add welcome message if chat history is empty
  if (req.session.chatHistory.length === 0) {
    addBotMessage(
      req,
      "🍽️ Welcome to Tasty Bites Restaurant! How can I help you today?"
    );
    addBotMessage(req, getMainMenuOptions());
  }

  res.render("index", {
    chatHistory: req.session.chatHistory,
    paystackPublicKey: PAYSTACK_PUBLIC_KEY,
  });
});

app.post("/chat", async (req, res) => {
  initializeSession(req);

  const userInput = req.body.message?.trim();

  if (!userInput) {
    return res.json({
      success: false,
      message: "Please enter a valid option.",
    });
  }

  // Add user message to history
  addUserMessage(req, userInput);

  // Process user input based on current state
  const response = await processUserInput(req, userInput);

  // Add bot response to history
  addBotMessage(req, response);

  res.json({
    success: true,
    chatHistory: req.session.chatHistory,
  });
});

const processUserInput = async (req, input) => {
  const state = req.session.currentState;

  switch (state) {
    case "main":
      return handleMainMenu(req, input);
    case "categories":
      return handleCategorySelection(req, input);
    case "menu":
      return handleMenuSelection(req, input);
    case "scheduling":
      return handleScheduling(req, input);
    default:
      req.session.currentState = "main";
      return getMainMenuOptions();
  }
};

const handleMainMenu = (req, input) => {
  switch (input) {
    case "1":
      req.session.currentState = "categories";
      return getCategoryMenu();

    case "99":
      if (req.session.currentOrder.length === 0) {
        return (
          "❌ No order to place. Please add items to your cart first.\n\n" +
          getMainMenuOptions()
        );
      }
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
      return (
        "❌ Invalid option. Please select from the available options:\n\n" +
        getMainMenuOptions()
      );
  }
};

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
      // In a real app, you'd implement time selection
      req.session.scheduledTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      return (
        "⏰ Order scheduled for 1 hour from now.\n\n" +
        "💳 Please choose payment method:\n" +
        "1️⃣ Pay with Paystack\n" +
        "0️⃣ Back to main menu"
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

// Payment routes
app.post("/initiate-payment", async (req, res) => {
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
        email: email,
        amount: total * 100, // Paystack expects amount in kobo
        callback_url: `${req.protocol}://${req.get("host")}/payment/callback`,
        metadata: {
          order_id: Date.now(),
          device_id: req.session.deviceId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
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

app.get("/payment/callback", async (req, res) => {
  const reference = req.query.reference;

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (response.data.data.status === "success") {
      // Move current order to order history
      req.session.orderHistory.push({
        id: Date.now(),
        items: [...req.session.currentOrder],
        total: calculateOrderTotal(req.session.currentOrder),
        status: "Paid",
        date: new Date(),
        reference: reference,
      });

      // Clear current order
      req.session.currentOrder = [];
      req.session.currentState = "main";

      // Add success message to chat
      addBotMessage(
        req,
        "✅ Payment successful! Your order has been placed and will be prepared soon."
      );
      addBotMessage(req, getMainMenuOptions());

      res.redirect("/");
    } else {
      addBotMessage(req, "❌ Payment failed. Please try again.");
      addBotMessage(req, getMainMenuOptions());
      res.redirect("/");
    }
  } catch (error) {
    console.error(
      "Payment verification error:",
      error.response?.data || error.message
    );
    addBotMessage(
      req,
      "❌ Payment verification failed. Please contact support."
    );
    addBotMessage(req, getMainMenuOptions());
    res.redirect("/");
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

app.listen(PORT, () => {
  console.log(`Restaurant ChatBot server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to start chatting!`);
});

module.exports = app;
