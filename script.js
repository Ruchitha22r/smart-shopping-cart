
// =====================================
// SMART SHOPPING CART - JAVASCRIPT
// =====================================

// MQTT Configuration
const MQTT_SERVER = "wss://broker.emqx.io:8084/mqtt";
const MQTT_TOPIC =
    "smartshoppingcart/esp32_rfid_20261031_1856/cart";

// Available Products
const products = [
    {
        id: 1,
        name: "Milk",
        price: 60,
        icon: "🥛",
        stock: 20,
        initialStock: 20
    },
    {
        id: 2,
        name: "Bread",
        price: 40,
        icon: "🍞",
        stock: 15,
        initialStock: 15
    },
    {
        id: 3,
        name: "Rice",
        price: 150,
        icon: "🍚",
        stock: 10,
        initialStock: 10
    },
    {
        id: 4,
        name: "Biscuits",
        price: 100,
        icon: "🍪",
        stock: 25,
        initialStock: 25
    },
    {
        id: 5,
        name: "Apple",
        price: 30,
        icon: "🍎",
        stock: 30,
        initialStock: 30
    },
    {
        id: 6,
        name: "Juice",
        price: 50,
        icon: "🧃",
        stock: 18,
        initialStock: 18
    }
];

// Shopping Cart
let cart = [];

// Display Available Products
function displayProducts() {
    const productList = document.getElementById("product-list");

    productList.innerHTML = "";

    products.forEach(product => {
        const productCard = document.createElement("div");

        productCard.className = "product-card";

        productCard.innerHTML = `
            <div class="product-image">${product.icon}</div>
            <h3>${product.name}</h3>
            <p>Price: ₹${product.price}</p>
            <p>Available Stock: ${product.stock}</p>
            <button onclick="addToCart(${product.id})">
                Add to Cart
            </button>
        `;

        productList.appendChild(productCard);
    });

    updateSummary();
}

// Add Product to Cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);

    if (!product || product.stock <= 0) {
        alert("Product is out of stock!");
        return;
    }

    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {
        cartItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    product.stock--;

    displayProducts();
    displayCart();
}

// Remove Product from Cart
function removeFromCart(productId) {
    const cartItem = cart.find(item => item.id === productId);

    if (!cartItem) return;

    const product = products.find(p => p.id === productId);

    product.stock += cartItem.quantity;

    cart = cart.filter(item => item.id !== productId);

    displayProducts();
    displayCart();
}

// Display Shopping Cart
function displayCart() {
    const cartItems = document.getElementById("cart-items");

    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartItems.innerHTML = "<p>Your cart is empty.</p>";
    } else {
        cart.forEach(item => {
            const cartItem = document.createElement("div");

            cartItem.className = "cart-item";

            cartItem.innerHTML = `
                <span>${item.icon} ${item.name} × ${item.quantity}</span>
                <span>₹${item.price * item.quantity}</span>
                <button onclick="removeFromCart(${item.id})">
                    Remove
                </button>
            `;

            cartItems.appendChild(cartItem);
        });
    }

    updateSummary();
}

// Update Shopping Summary
function updateSummary() {
    const totalProducts = products.length;

    const cartCount = cart.reduce(
        (total, item) => total + item.quantity, 0
    );

    const totalAmount = cart.reduce(
        (total, item) => total + item.price * item.quantity, 0
    );

    document.getElementById("product-count").textContent = totalProducts;

    document.getElementById("cart-count").textContent = cartCount;

    document.getElementById("total-amount").textContent =
        "₹" + totalAmount;

    document.getElementById("grand-total").textContent =
        "Grand Total: ₹" + totalAmount;
}

// Checkout
function checkout() {
    if (cart.length === 0) {
        alert("Your shopping cart is empty!");
        return;
    }

    const totalAmount = cart.reduce(
        (total, item) => total + item.price * item.quantity, 0
    );

    alert(
        "Shopping Successful!\n\n" +
        "Total Amount: ₹" + totalAmount +
        "\n\nThank you for shopping!"
    );

    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);

        if (product) {
            product.stock = Math.min(
                product.initialStock,
                product.stock + item.quantity
            );
        }
    });

    cart = [];

    displayProducts();
    displayCart();
}

// Receive ESP32 Shopping Cart Data
function updateCartFromESP32(data) {
    if (
        typeof data.milk !== "number" ||
        typeof data.bread !== "number" ||
        typeof data.rice !== "number" ||
        typeof data.biscuits !== "number"
    ) {
        console.error("Invalid ESP32 cart data:", data);
        return;
    }

    if (data.action === "checkout") {
        cart = [];

        products.forEach(product => {
            product.stock = product.initialStock;
        });

        displayProducts();
        displayCart();

        console.log("ESP32 checkout received. Dashboard cart reset.");
        return;
    }

    const quantities = {
        1: data.milk,
        2: data.bread,
        3: data.rice,
        4: data.biscuits
    };

    cart = [];

    products.forEach(product => {
        if (quantities[product.id] !== undefined) {
            const quantity = Math.max(
                0,
                Math.floor(quantities[product.id])
            );

            product.stock = Math.max(
                0,
                product.initialStock - quantity
            );

            if (quantity > 0) {
                cart.push({
                    ...product,
                    quantity: quantity
                });
            }
        } else {
            product.stock = product.initialStock;
        }
    });

    displayProducts();
    displayCart();

    console.log("Dashboard updated from ESP32:", data);
}

// Connect Dashboard to MQTT
function connectMQTT() {
    console.log("Loading MQTT library...");

    const mqttScript = document.createElement("script");

    mqttScript.src =
        "https://unpkg.com/mqtt/dist/mqtt.min.js";

    mqttScript.onload = function () {
        console.log("MQTT library loaded.");

        const client = mqtt.connect(MQTT_SERVER, {
            clientId:
                "SmartCartDashboard_" +
                Math.random().toString(16).substring(2, 10),
            clean: true,
            connectTimeout: 10000,
            reconnectPeriod: 3000
        });

        client.on("connect", function () {
            console.log("Dashboard connected to MQTT!");

            client.subscribe(MQTT_TOPIC, function (error) {
                if (error) {
                    console.error("MQTT subscription error:", error);
                } else {
                    console.log("Subscribed to shopping cart updates!");
                }
            });
        });

        client.on("message", function (topic, message) {
            if (topic !== MQTT_TOPIC) return;

            try {
                const data = JSON.parse(message.toString());

                console.log("ESP32 message received:", data);

                updateCartFromESP32(data);
            } catch (error) {
                console.error("Invalid MQTT message:", error);
            }
        });

        client.on("error", function (error) {
            console.error("MQTT connection error:", error);
        });

        client.on("reconnect", function () {
            console.log("Reconnecting to MQTT...");
        });
    };

    mqttScript.onerror = function () {
        console.error("Could not load the MQTT library.");
    };

    document.head.appendChild(mqttScript);
}

// Checkout Button Event
document.getElementById("checkout-btn").addEventListener(
    "click",
    checkout
);

// Start Application
displayProducts();
displayCart();
connectMQTT();
