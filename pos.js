// pos.js - Product list and cart functionality for POS page

// Sample product data (you can replace with real data or fetch from a server)
const products = [
    {
        id: 1,
        name: "สินค้า A",
        price: 120.0,
        img: "https://via.placeholder.com/80?text=A"
    },
    {
        id: 2,
        name: "สินค้า B",
        price: 85.5,
        img: "https://via.placeholder.com/80?text=B"
    },
    {
        id: 3,
        name: "สินค้า C",
        price: 45.0,
        img: "https://via.placeholder.com/80?text=C"
    }
];

// Load cart from sessionStorage or start with empty array
let cart = JSON.parse(sessionStorage.getItem('posCart')) || [];

// Helper to format currency
function formatCurrency(value) {
    return `฿${value.toFixed(2)}`;
}

// Render product grid
function renderProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <h4>${p.name}</h4>
      <p>${formatCurrency(p.price)}</p>
      <button class="btn btn-secondary" data-id="${p.id}">เพิ่ม</button>
    `;
        grid.appendChild(card);
    });

    // Attach click handlers for Add buttons
    grid.querySelectorAll('button[data-id]').forEach(btn => {
        btn.addEventListener('click', () => addToCart(parseInt(btn.dataset.id)));
    });
}

// Add product to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    }
    saveCart();
    renderCart();
}

// Render cart items
function renderCart() {
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    cart.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
      <span>${item.name} x${item.qty}</span>
      <span>${formatCurrency(item.price * item.qty)}</span>
    `;
        list.appendChild(li);
    });
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    document.getElementById('cart-total').textContent = formatCurrency(total);
}

// Persist cart to sessionStorage
function saveCart() {
    sessionStorage.setItem('posCart', JSON.stringify(cart));
}

// Initialize page
function initPOS() {
    renderProducts();
    renderCart();
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPOS);
} else {
    initPOS();
}
