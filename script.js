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
        style="background:#cc0000; padding:4px 8px; font-size:10px; border-radius:4px; border:none; color:white; cursor:pointer;">
        Remove
      </button>
    `;

    cartList.appendChild(li);
  });

  totalDisplay.innerText = total.toFixed(2);
}

function removeFromCart(productName) {
  cart = cart.filter(item => item.name !== productName);
  updateCartUI();
}

async function submitOrder() {
  if (cart.length === 0) return;

  // Telegram WebApp user info (if running inside Telegram)
  const tg = window.Telegram ? window.Telegram.WebApp : null;
  const customerName =
    (tg && tg.initDataUnsafe && tg.initDataUnsafe.user)
      ? (tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name)
      : "Guest";

  const orderData = {
    customer: customerName,
    items: cart,
    total: total,
    timestamp: new Date().toISOString()
  };

  try {
    // With 'no-cors', we can't read a response body, but the data is handed off.
    await fetch(PROXY_URL, {
      method: "POST",
      mode: "no-cors",
      cache: "no-cache",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData)
    });

    const successMsg = "Order Sent! Payment due to Capt. Pope at FTX.";
    if (tg) {
      tg.showAlert(successMsg);
      tg.close();
    } else {
      alert(successMsg);
    }

    // Reset cart
    cart = [];
    updateCartUI();

  } catch (e) {
    const errorMsg = "Connection Error: " + e.message;
    if (tg) tg.showAlert(errorMsg);
    else alert(errorMsg);
  }
}

// ------------------------------
// LOAD & RENDER PRODUCTS
// ------------------------------

async function loadInventoryAndRender() {
  const productsEl = document.getElementById("products");
  if (!productsEl) return;

  productsEl.innerHTML = "Loading products…";

  try {
    const res = await fetch(INVENTORY_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    productsEl.innerHTML = "";

    items.forEach(item => {
      const name = item.name || "Unnamed";
      const id = (item.id || name).toString();
      const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
      const qtyInputId = `qty_${safeId}`;

      const price = Number(item.price || 0);
      const stock = Number(item.stock || 0);
      const threshold = Number(item.threshold || 0);

      const div = document.createElement("div");
      div.className = "product";

      const imgHtml = item.image
        ? `<img src="${item.image}" alt="${escapeHtml(name)}"
             style="width:90px;height:90px;object-fit:cover;border-radius:8px;margin:0 auto 10px auto;display:block;">`
        : "";

      div.innerHTML = `
        ${imgHtml}
        <span class="product-info">${escapeHtml(name)} - $${price.toFixed(2)}</span>
        ${item.description ? `<div style="margin-bottom:8px;">${escapeHtml(item.description)}</div>` : ""}
        <div style="margin-bottom:10px; color:#bbb;">Stock: ${stock} | Reorder at: ${threshold}</div>
        <div class="controls">
          <input id="${qtyInputId}" type="number" min="1" value="1" />
          <button onclick="addToCart(${price}, '${qtyInputId}', '${escapeQuotes(name)}')">Add</button>
        </div>
      `;

      productsEl.appendChild(div);
    });

    updateCartUI();

  } catch (err) {
    productsEl.innerHTML = `Failed to load inventory. (${escapeHtml(err.message)})`;
  }
}

// Helpers
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function escapeQuotes(str) {
  return String(str).replaceAll("'", "\\'");
}

// Run on load
document.addEventListener("DOMContentLoaded", () => {
  loadInventoryAndRender();
  updateCartUI();
});
