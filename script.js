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

    cart.push({ id, name, price, quantity: qty, size });

    updateCart();
}

function updateCart() {
    const list = document.getElementById("cart-items");
    list.innerHTML = "";
    total = 0;

    cart.forEach(item => {
        const li = document.createElement("li");
        const lineTotal = item.price * item.quantity;
        total += lineTotal;

        li.innerText =
            `${item.name}` +
            (item.size ? ` (${item.size})` : "") +
            ` x${item.quantity} - $${lineTotal}`;

        list.appendChild(li);
    });

    document.getElementById("total").innerText = total;
}

async function submitOrder() {

    if (cart.length === 0) return;

    const orderData = {
        customer: "TelegramUser",
        items: cart,
        total: total,
        timestamp: new Date().toISOString()
    };

    try {

        const response = await fetch(PROXY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (result.success && result.orderNumber) {

            alert(
                `Order #${result.orderNumber} submitted successfully!\n\n` +
                `Please save your order number for reference.\n\n` +
                `Payment due to Capt. Pope at FTX.`
            );

        } else {
            alert("Order submitted, but confirmation could not be verified.");
        }

        cart = [];
        updateCart();
        loadProducts();

    } catch (error) {
        alert("There was an error submitting your order. Please try again.");
    }
}

loadProducts();
