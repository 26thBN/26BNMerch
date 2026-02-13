let cart = [];
let total = 0;

function addToCart(price, inputId, productName) {
    const qtyInput = document.getElementById(inputId);
    const quantity = parseInt(qtyInput.value) || 1;

    // Check if item already exists in cart
    const existingItem = cart.find(item => item.name === productName);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ name: productName, price: price, quantity: quantity });
    }

    updateCartUI();
    qtyInput.value = 1; // Reset input field
}

function removeFromCart(productName) {
    // Filter out the item entirely
    cart = cart.filter(item => item.name !== productName);
    updateCartUI();
}

function updateQuantity(productName, amount) {
    const item = cart.find(item => item.name === productName);
    if (item) {
        item.quantity += amount;
        // If quantity hits 0, remove it
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
        li.style.margin = "10px 0";
        li.innerHTML = `
            ${item.name} x${item.quantity} - $${itemTotal}
            <button onclick="updateQuantity('${item.name}', -1)">-</button>
            <button onclick="updateQuantity('${item.name}', 1)">+</button>
            <button onclick="removeFromCart('${item.name}')" style="color:red; margin-left:10px;">Remove</button>
        `;
        cartList.appendChild(li);
    });

    totalDisplay.innerText = total;
}

function sendToTelegram() {
    const tg = window.Telegram.WebApp;
    tg.sendData(JSON.stringify({
        order: cart,
        total_price: total
    }));
    tg.close();
}
