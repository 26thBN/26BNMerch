let cart = [];
let total = 0;

const PROXY_URL = "https://script.google.com/macros/s/AKfycbyEk3khZc36ezbMMTSVIBYv-Jh_3jN6-R7C-541X8kO70_6xuDRLnA85S8DwMEb4uXC/exec";
const INVENTORY_URL = "inventory.json";

async function loadProducts() {
    try {

        const response = await fetch(INVENTORY_URL);

        if (!response.ok) {
            throw new Error("Inventory failed to load");
        }

        const data = await response.json();

        console.log(data);
        console.log(data.items);

        if (!data.items || !Array.isArray(data.items)) {
            throw new Error("Inventory format invalid");
        }

        const container = document.getElementById("products");
        container.innerHTML = "";

        data.items.forEach(item => {

            const div = document.createElement("div");
            div.className = "product";

            let sizeOptions = "";

            if (item.sizes) {
                Object.keys(item.sizes).forEach(size => {
                    sizeOptions += `
                        <option value="${size}">
                            ${size}
                        </option>
                    `;
                });
            }

            div.innerHTML = `
                <img src="${item.image}" />
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <p>$${item.price}</p>

                ${item.sizes
                    ? `<select id="size-${item.id}">${sizeOptions}</select>`
                    : ""}

                <br>
                <input type="number" id="qty-${item.id}" value="1" min="1">
                <br>
                <button onclick="addToCart('${item.id}', '${item.name}', ${item.price})">
                    Preorder
                </button>
            `;

            container.appendChild(div);
        });

    } catch (error) {
        console.error("LOAD ERROR:", error);
        document.getElementById("products").innerHTML =
            "<p style='color:red'>Inventory failed to load. Please refresh.</p>";
    }
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
    const customerEmail = document.getElementById("customerEmail").value.trim();
    const state = document.getElementById("state").value;

    if (!customerEmail) {
        alert("Email is required.");
        return;
    }

    if (!callsign) {
        alert("Please enter your callsign.");
        return;
    }

    if (!state) {
        alert("Please select your state.");
        return;
    }

    const orderData = {
        customer: callsign,
        customerEmail: customerEmail,
        state: state,
        items: cart,
        total: total,
        timestamp: new Date().toISOString()
    };

    const overlay = document.getElementById("encryptionOverlay");
    const terminal = document.getElementById("terminalText");
    const progress = document.getElementById("progressFill");

    overlay.style.display = "flex";
    terminal.innerText = "";
    progress.style.width = "0%";
    progress.style.display = "block";

    const lines = [
        "INITIALIZING SECURE TRANSMISSION...",
        "ESTABLISHING ENCRYPTED CHANNEL...",
        "HASHING ORDER PAYLOAD...",
        "ENCRYPTING ORDER DATA...",
        "VERIFYING CHECKSUM...",
        "TRANSMITTING TO COMMAND..."
    ];

    for (let i = 0; i < lines.length; i++) {
        terminal.innerText += lines[i] + "\n";
        progress.style.width = ((i + 1) / lines.length * 100) + "%";
        await new Promise(r => setTimeout(r, 400));
    }

    try {
        await fetch(PROXY_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(orderData)
        });

        // Clean Success Layout
        terminal.innerHTML = `
            terminal.innerHTML = `
<div style="
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    text-align:center;
    gap:12px;
    max-width:500px;
    margin:0 auto;
">
    <div style="font-weight:bold; font-size:16px;">
        🔐 ENCRYPTION COMPLETE
    </div>

    <div>Preorder Submitted Successfully.</div>

    <div>You will receive an email confirmation shortly.</div>

    <div style="font-size:13px;">
        Payment must be remitted to your group Capt. prior to receiving your order.
    </div>

    <button id="overlayOkBtn" style="
        padding:8px 22px;
        background:#00ff00;
        color:black;
        font-weight:bold;
        border:none;
        border-radius:4px;
        cursor:pointer;
        min-width:90px;
    ">
        OK
    </button>
</div>
`;


        progress.style.display = "none";

        document.getElementById("overlayOkBtn").addEventListener("click", () => {
            overlay.style.display = "none";
            cart = [];
            updateCart();
            loadProducts();
        });

    } catch (error) {

        overlay.style.display = "none";
        alert("There was an error submitting your order. Please try again.");
    }
}

loadProducts();

