let cart = [];
let total = 0;

const PROXY_URL = "https://script.google.com/macros/s/AKfycbyEk3khZc36ezbMMTSVIBYv-Jh_3jN6-R7C-541X8kO70_6xuDRLnA85S8DwMEb4uXC/exec";
const INVENTORY_URL = "https://raw.githubusercontent.com/26thBN/26BNMerch/main/inventory.json";

async function loadProducts() {
    const response = await fetch(INVENTORY_URL);
    const data = await response.json();
    const container = document.getElementById("products");
    container.innerHTML = "";

    data.items.forEach(item => {

        const div = document.createElement("div");
        div.className = "product";

        let sizeOptions = "";
        let allSoldOut = false;

        if (item.sizes) {
            let soldCount = 0;

            Object.keys(item.sizes).forEach(size => {
                const stock = item.sizes[size];
                if (stock === 0) soldCount++;

                sizeOptions += `
                    <option value="${size}" ${stock === 0 ? "disabled" : ""}>
                        ${size} ${stock === 0 ? "(Sold Out)" : ""}
                    </option>
                `;
            });

            if (soldCount === Object.keys(item.sizes).length) {
                allSoldOut = true;
            }
        } else {
            if (item.stock === 0) allSoldOut = true;
        }

        div.innerHTML = `
            <img src="${item.image}" />
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <p>$${item.price}</p>

            ${item.stock <= item.threshold && item.stock > 0
                ? `<div class="low-stock">⚠ LOW STOCK</div>`
                : ""}

            ${item.sizes
                ? `<select id="size-${item.id}">${sizeOptions}</select>`
                : ""}

            <br>
            <input type="number" id="qty-${item.id}" value="1" min="1">
            <br>
            <button ${allSoldOut ? "disabled" : ""}
                onclick="addToCart('${item.id}', '${item.name}', ${item.price})">
                ${allSoldOut ? "Sold Out" : "Add to Cart"}
            </button>
        `;

        if (allSoldOut) {
            const overlay = document.createElement("div");
            overlay.className = "sold-overlay";
            overlay.innerText = "SOLD OUT";
            div.appendChild(overlay);
        }

        container.appendChild(div);
    });
}

function addToCart(id, name, price) {
    const qty = parseInt(document.getElementById(`qty-${id}`).value);
    const sizeSelect = document.getElementById(`size-${id}`);
    const size = sizeSelect ? sizeSelect.value : null;

    const existing = cart.find(item => item.id === id && item.size === size);

    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({ id, name, price, quantity: qty, size });
    }

    updateCart();
}

function updateCart() {
    const list = document.getElementById("cart-items");
    list.innerHTML = "";
    total = 0;

    cart.forEach((item, index) => {
        const lineTotal = item.price * item.quantity;
        total += lineTotal;

        const li = document.createElement("li");

        li.innerHTML = `
            ${item.name}
            ${item.size ? `(${item.size})` : ""}
            x${item.quantity}
            - $${lineTotal}
            <button onclick="changeQty(${index}, -1)">-</button>
            <button onclick="changeQty(${index}, 1)">+</button>
            <button onclick="removeItem(${index})">Remove</button>
        `;

        list.appendChild(li);
    });

    document.getElementById("total").innerText = total;
}

function changeQty(index, amount) {
    cart[index].quantity += amount;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    updateCart();
}

function removeItem(index) {
    cart.splice(index, 1);
    updateCart();
}

async function submitOrder() {

    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const callsign = document.getElementById("callsign").value.trim();

    if (!callsign) {
        alert("Please enter your callsign.");
        return;
    }

    const customerEmail = document.getElementById("customerEmail").value.trim();

const orderData = {
    customer: callsign,
    customerEmail: customerEmail || null,
    items: cart,
    total: total,
    timestamp: new Date().toISOString()
};


    try {
        await fetch(PROXY_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" }, // ✅ changed
            body: JSON.stringify(orderData)
        });

        alert(
            "Order submitted successfully.\n\n" +
            "You will receive an email confirmation shortly.\n\n" +
            "Payment due to Capt. Pope at FTX."
        );

        cart = [];
        updateCart();
        loadProducts();

    } catch (error) {
        alert("There was an error submitting your order. Please try again.");
    }
}

loadProducts();

