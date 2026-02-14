let cart = [];
let total = 0;

// Your Google Bridge URL (unchanged)
const PROXY_URL =
  "https://script.google.com/macros/s/AKfycbyEk3khZc36ezbMMTSVIBYv-Jh_3jN6-R7C-541X8kO70_6xuDRLnA85S8DwMEb4uXC/exec";

// Pull inventory from your GitHub Pages site (same site as the store)
// Cache-buster prevents Telegram/web caching from showing old inventory.
const INVENTORY_URL = "./inventory.json?ts=" + Date.now();

// Supported size keys
const STANDARD_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const ONE_SIZE_KEYS = ["OSFA", "ONE"]; // One Size Fits All (or ONE)

// -------------------- CART --------------------

function addToCart(price, qtyInputId, sizeSelectId, productName) {
  const qtyInput = document.getElementById(qtyInputId);
  const sizeSelect = sizeSelectId ? document.getElementById(sizeSelectId) : null;

  const quantity = parseInt(qtyInput?.value, 10) || 1;
  const size = sizeSelect ? (sizeSelect.value || null) : null; // null = no size

  // Unique item in cart = name + size (size null allowed)
  const existingItem = cart.find(
    (item) => item.name === productName && (item.size ?? null) === (size ?? null)
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ name: productName, size: size, price: price, quantity: quantity });
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

  cart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    const li = document.createElement("li");
    li.className = "cart-item";

    const sizeText = item.size ? ` [${escapeHtml(item.size)}]` : "";

    li.innerHTML = `
      <span>${escapeHtml(item.name)}${sizeText} (x${item.quantity}) - $${itemTotal.toFixed(2)}</span>
      <button onclick="removeFromCart('${escapeQuotes(item.name)}','${escapeQuotes(item.size ?? "")}')"
        style="background:#cc0000; padding:4px 8px; font-size:10px; border-radius:4px; border:none; color:white; cursor:pointer;">
        Remove
      </button>
    `;

    cartList.appendChild(li);
  });

  totalDisplay.innerText = total.toFixed(2);
}

function removeFromCart(productName, sizeStr) {
  const size = sizeStr === "" ? null : sizeStr;
  cart = cart.filter((item) => !(item.name === productName && (item.size ?? null) === (size ?? null)));
  updateCartUI();
}

async function submitOrder() {
  if (cart.length === 0) return;

  // Telegram WebApp user info (if running inside Telegram)
  const tg = window.Telegram ? window.Telegram.WebApp : null;
  const customerName =
    tg && tg.initDataUnsafe && tg.initDataUnsafe.user
      ? tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name
      : "Guest";

  const orderData = {
    customer: customerName,
    items: cart, // includes size null/OSFA/standard sizes
    total: total,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(PROXY_URL, {
      method: "POST",
      mode: "no-cors",
      cache: "no-cache",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    const successMsg = "Order Sent! Payment due to Capt. Pope at FTX.";
    if (tg) {
      tg.showAlert(successMsg);
      tg.close();
    } else {
      alert(successMsg);
    }

    cart = [];
    updateCartUI();
  } catch (e) {
    const errorMsg = "Connection Error: " + e.message;
    if (tg) tg.showAlert(errorMsg);
    else alert(errorMsg);
  }
}

// -------------------- INVENTORY RENDER --------------------

function hasSizes(item) {
  return item && item.sizes && typeof item.sizes === "object" && !Array.isArray(item.sizes);
}

function totalStockFromSizes(sizesObj) {
  if (!sizesObj || typeof sizesObj !== "object") return null;
  let sum = 0;
  for (const k of Object.keys(sizesObj)) {
    const v = Number(sizesObj[k] || 0);
    if (!Number.isNaN(v)) sum += v;
  }
  return sum;
}

function buildSizeOptionsAndMode(sizesObj) {
  // Returns { mode: "none" | "one" | "multi", optionsHtml: string }
  if (!sizesObj || typeof sizesObj !== "object") {
    return { mode: "none", optionsHtml: "" };
  }

  // ONE SIZE: OSFA/ONE present and >0
  for (const key of ONE_SIZE_KEYS) {
    const qty = Number(sizesObj[key] || 0);
    if (qty > 0) {
      return { mode: "one", optionsHtml: `<option value="${key}">${key}</option>` };
    }
  }

  // MULTI SIZE: S-3XL
  const opts = [];
  for (const s of STANDARD_SIZES) {
    const qty = Number(sizesObj[s] || 0);
    if (qty > 0) opts.push(`<option value="${s}">${s}</option>`);
  }

  if (opts.length === 0) {
    // sizes object exists but all are zero -> treat as none (hide selector)
    return { mode: "none", optionsHtml: "" };
  }

  return { mode: "multi", optionsHtml: opts.join("") };
}

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

    items.forEach((item) => {
      const name = item.name || "Unnamed";
      const id = (item.id || name).toString();
      const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");

      const qtyInputId = `qty_${safeId}`;
      const sizeSelectId = `size_${safeId}`;

      const price = Number(item.price || 0);

      // Sizes
      const sizesObj = hasSizes(item) ? item.sizes : null;
      const sizeMeta = buildSizeOptionsAndMode(sizesObj);

      // Stock display:
      // - If sizes exist -> sum sizes
      // - Else -> use item.stock
      const computedStock = totalStockFromSizes(sizesObj);
      const stockToShow = computedStock !== null ? computedStock : Number(item.stock || 0);

      const div = document.createElement("div");
      div.className = "product";

      const imgHtml = item.image
        ? `<img src="${item.image}" alt="${escapeHtml(name)}"
             style="width:90px;height:90px;object-fit:cover;border-radius:8px;margin:0 auto 10px auto;display:block;">`
        : "";

      // Size UI:
      // - mode none: hide size selector entirely
      // - mode one/multi: show selector
      const sizeUiHtml =
        sizeMeta.mode === "none"
          ? ""
          : `
            <label style="color:#bbb;">
              Size:
              <select id="${sizeSelectId}"
                style="padding:8px;border-radius:4px;border:none;background:#333;color:white;">
                ${sizeMeta.optionsHtml}
              </select>
            </label>
          `;

      // When no size selector, we pass null for sizeSelectId
      const addButtonOnClick =
        sizeMeta.mode === "none"
          ? `addToCart(${price}, '${qtyInputId}', null, '${escapeQuotes(name)}')`
          : `addToCart(${price}, '${qtyInputId}', '${sizeSelectId}', '${escapeQuotes(name)}')`;

      div.innerHTML = `
        ${imgHtml}
        <span class="product-info">${escapeHtml(name)} - $${price.toFixed(2)}</span>
        ${item.description ? `<div style="margin-bottom:8px;">${escapeHtml(item.description)}</div>` : ""}
        <div style="margin-bottom:10px; color:#bbb;">Stock: ${stockToShow}</div>

        <div class="controls" style="gap:10px; flex-wrap:wrap;">
          ${sizeUiHtml}
          <input id="${qtyInputId}" type="number" min="1" value="1" />
          <button onclick="${addButtonOnClick}">Add</button>
        </div>
      `;

      productsEl.appendChild(div);
    });

    updateCartUI();
  } catch (err) {
    productsEl.innerHTML = `Failed to load inventory. (${escapeHtml(err.message)})`;
  }
}

// -------------------- HELPERS --------------------

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

// Run on page load
document.addEventListener("DOMContentLoaded", () => {
  loadInventoryAndRender();
  updateCartUI();
});
