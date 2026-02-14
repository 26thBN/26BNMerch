let cart = [];
let total = 0;

// Your Google Bridge URL (unchanged)
const PROXY_URL = "https://script.google.com/macros/s/AKfycbyEk3khZc36ezbMMTSVIBYv-Jh_3jN6-R7C-541X8kO70_6xuDRLnA85S8DwMEb4uXC/exec";

// Pull inventory from your GitHub Pages site (same site as the store)
// Cache-buster prevents Telegram/web caching from showing old inventory.
const INVENTORY_URL = "./inventory.json?ts=" + Date.now();

function addToCart(price, inputId, productName) {
  const qtyInput = document.getElementById(inputId);
  const quantity = parseInt(qtyInput?.value, 10) || 1;

  const existingItem = cart.find(item => item.name === productName);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ name: productName, price: price, quantity: quantity });
  }

  updateCartUI();
  if (qtyInput) qtyInput.value = 1;
}

function updateCartUI() {
  const cartList = document.getElementById("cart-items");
  const totalDisplay = document.getElementById("total");

  if (!cartList || !totalDisplay) return;

  cartList.innerHTML = "";
  total = 0;

  if (cart.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Cart is empty.";
    li.style.listStyle = "none";
    li.style.background = "transparent";
    li.style.padding = "0";
    cartList.appendChild(li);

    totalDisplay.innerText = "0.00";
    return;
  }

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    const li = document.createElement("li");
    li.className = "cart-item";

    li.innerHTML = `
      <span>${escapeHtml(item.name)} (x${item.quantity}) - $${itemTotal.toFixed(2)}</span>
      <button onclick="removeFromCart('${escapeQuotes(item.name)}')"
        style="backgroun
