let cart = [];
let total = 0;

// CONFIGURATION
const GITHUB_USER = "YOUR_GITHUB_USERNAME";
const REPO_NAME = "26th-bn-merch";
const GITHUB_PAT = "YOUR_PERSONAL_ACCESS_TOKEN";

function addToCart(price, inputId, productName) {
    const qtyInput = document.getElementById(inputId);
    const quantity = parseInt(qtyInput.value) || 1;
    const existingItem = cart.find(item => item.name === productName);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ name: productName, price: price, quantity: quantity });
    }

    updateCartUI();
    qtyInput.value = 1; // Reset input field after adding
}

function removeFromCart(productName) {
    cart = cart.filter(item => item.name !== productName);
    updateCartUI();
}

function updateQuantity(productName, amount) {
    const item = cart.find(item => item.name === productName);
    if (item) {
        item.quantity += amount;
        if (item.quantity <= 0) {
            removeFromCart(productName);
        } else {
            updateCartUI();
        }
    }
}

function updateCartUI() {
    const cartList = document.getElementById('cart-items');
    const totalDisplay = document.getElementById('total');
    cartList.innerHTML = '';
    total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const li = document.createElement('li');
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        li.style.margin = "10px 0";
        
        li.innerHTML = `
            <span>${item.name} (x${item.quantity}) - $${itemTotal}</span>
            <div>
                <button onclick="updateQuantity('${item.name}', -1)">-</button>
                <button onclick="updateQuantity('${item.name}', 1)">+</button>
                <button onclick="removeFromCart('${item.name}')" style="background: #dc3545; margin-left: 5px;">Remove</button>
            </div>
        `;
        cartList.appendChild(li);
    });

    totalDisplay.innerText = total;
}

async function submitOrder() {
    if (cart.length === 0) return;
    const tg = window.Telegram.WebApp;
    
    const orderData = {
        customer: tg.initDataUnsafe.user?.username || tg.initDataUnsafe.user?.first_name || "Guest",
        items: cart,
        total: total,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(`https://api.github.com{GITHUB_USER}/${REPO_NAME}/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_type: 'new_order',
                client_payload: orderData
            })
        });

        if (response.ok) {
            tg.showAlert("Order Sent! Payment due at next FTX.");
            cart = [];
            updateCartUI();
            tg.close();
        } else {
            tg.showAlert("Error sending order. Please try again.");
        }
    } catch (error) {
        tg.showAlert("Connection failed.");
    }
}
