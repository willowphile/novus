/* =====================================================================
   checkout.js - the mock shop and checkout flow (index.html pages
   #checkout-shop, #checkout-cart, #checkout-shipping, #checkout-payment,
   #checkout-review, #checkout-done).

   Nothing is real. Data lives in localStorage so a reload keeps your cart:
     ts.cart      -> [{ id, qty }, ...]
     ts.promo     -> the applied promo code (or nothing)
     ts.shipping  -> { name, address, city, zip, method }
   Card details are NEVER saved anywhere.

   Sections below: 1. data  2. cart helpers  3. drawing things
                   4. clicks and forms  5. start-up
   ===================================================================== */

(function () {

  // ---------- 1. DATA ----------
  var PRODUCTS = [
    { id: 'hoodie', name: 'Purple Hoodie',     price: 48, emoji: '🧥' },
    { id: 'mug',    name: 'Lavender Mug',      price: 14, emoji: '☕' },
    { id: 'sticker',name: 'Sticker Pack',      price: 6,  emoji: '🏷️' },
    { id: 'tote',   name: 'Canvas Tote',       price: 22, emoji: '👜' },
    { id: 'lamp',   name: 'Desk Lamp',         price: 35, emoji: '💡' },
    { id: 'plant',  name: 'Tiny Cactus',       price: 9,  emoji: '🌵' }
  ];
  var PROMO_CODES = { PURPLE10: 0.10 };      // code -> fraction off
  var TAX_RATE = 0.08;
  var STEPS = ['Cart', 'Shipping', 'Payment', 'Review'];

  var CART_KEY = 'ts.cart', PROMO_KEY = 'ts.promo', SHIP_KEY = 'ts.shipping';


  // ---------- 2. CART HELPERS ----------
  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function productById(id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; }
  function money(n) { return '$' + n.toFixed(2); }
  function esc(text) {                         // keep typed text from being treated as HTML
    var d = document.createElement('div'); d.textContent = text; return d.innerHTML;
  }

  function getCart() { return load(CART_KEY, []); }
  function cartCount() { return getCart().reduce(function (n, line) { return n + line.qty; }, 0); }

  function addToCart(id) {
    var cart = getCart();
    var line = cart.filter(function (l) { return l.id === id; })[0];
    if (line) line.qty++; else cart.push({ id: id, qty: 1 });
    save(CART_KEY, cart);
  }
  function changeQty(id, delta) {
    var cart = getCart();
    cart.forEach(function (l) { if (l.id === id) l.qty += delta; });
    save(CART_KEY, cart.filter(function (l) { return l.qty > 0; }));   // qty 0 removes the line
  }
  function removeLine(id) {
    save(CART_KEY, getCart().filter(function (l) { return l.id !== id; }));
  }

  // All the math in one place: subtotal, discount, shipping, tax, total.
  function totals() {
    var subtotal = getCart().reduce(function (sum, l) { return sum + productById(l.id).price * l.qty; }, 0);
    var promo = PROMO_CODES[load(PROMO_KEY, '')] || 0;
    var discount = subtotal * promo;
    var method = (load(SHIP_KEY, {}).method) || 'standard';
    var shipping = subtotal === 0 ? 0 : (method === 'express' ? 15 : (subtotal >= 75 ? 0 : 5));
    var tax = (subtotal - discount) * TAX_RATE;
    return { subtotal: subtotal, discount: discount, shipping: shipping, tax: tax,
             total: subtotal - discount + shipping + tax };
  }

  function track(name, props) {                // custom Pendo event (only if Pendo loaded)
    if (window.pendo && pendo.track) pendo.track(name, props);
    console.log('[track]', name, props);
  }


  // ---------- 3. DRAWING THINGS ----------
  // The little cart number(s) on the shop page.
  function drawBadge() {
    document.querySelectorAll('.cart-count').forEach(function (el) { el.textContent = cartCount(); });
  }

  // Shop: one card per product.
  function drawProducts() {
    document.getElementById('product-grid').innerHTML = PRODUCTS.map(function (p) {
      return '<div class="card product-card">' +
               '<div class="product-pic">' + p.emoji + '</div>' +
               '<h3>' + p.name + '</h3>' +
               '<p class="muted">' + money(p.price) + '</p>' +
               '<button class="btn btn-small add-to-cart" data-product="' + p.id + '">Add to cart</button>' +
             '</div>';
    }).join('');
  }

  // Cart page: one row per item with - / + / remove.
  function drawCart() {
    var cart = getCart();
    var box = document.getElementById('cart-items');
    if (!cart.length) {
      box.innerHTML = '<p>Your cart is empty.</p><button class="btn" data-goto="checkout-shop" id="cart-empty-shop">Go shopping</button>';
      box.querySelector('[data-goto]').addEventListener('click', function () { location.hash = 'checkout-shop'; });
      return;
    }
    box.innerHTML = cart.map(function (l) {
      var p = productById(l.id);
      return '<div class="cart-line" data-product="' + p.id + '">' +
               '<span class="cart-pic">' + p.emoji + '</span>' +
               '<span class="cart-name"><strong>' + p.name + '</strong><br><span class="muted">' + money(p.price) + ' each</span></span>' +
               '<span class="qty">' +
                 '<button class="btn btn-icon btn-small qty-minus" aria-label="Decrease quantity">−</button>' +
                 '<span class="qty-value">' + l.qty + '</span>' +
                 '<button class="btn btn-icon btn-small qty-plus" aria-label="Increase quantity">+</button>' +
               '</span>' +
               '<span class="cart-price">' + money(p.price * l.qty) + '</span>' +
               '<button class="btn btn-icon btn-small cart-remove" aria-label="Remove item">✕</button>' +
             '</div>';
    }).join('');
  }

  // The order-summary lines, drawn into every [data-summary] box.
  function drawSummary() {
    var t = totals();
    var html = '<div class="sum-row"><span>Subtotal</span><span>' + money(t.subtotal) + '</span></div>';
    if (t.discount) html += '<div class="sum-row"><span>Promo discount</span><span>−' + money(t.discount) + '</span></div>';
    html += '<div class="sum-row"><span>Shipping</span><span>' + (t.shipping ? money(t.shipping) : 'Free') + '</span></div>' +
            '<div class="sum-row"><span>Tax</span><span>' + money(t.tax) + '</span></div>' +
            '<div class="sum-row sum-total"><span>Total</span><span>' + money(t.total) + '</span></div>';
    document.querySelectorAll('[data-summary]').forEach(function (el) { el.innerHTML = html; });
  }

  // The "1 Cart → 2 Shipping → ..." bar at the top of each step.
  function drawSteps() {
    document.querySelectorAll('[data-steps]').forEach(function (bar) {
      var current = STEPS.map(function (s) { return s.toLowerCase(); }).indexOf(bar.getAttribute('data-steps'));
      bar.innerHTML = STEPS.map(function (label, i) {
        var cls = i < current ? 'done' : (i === current ? 'current' : '');
        return '<div class="step ' + cls + '">' + (i + 1) + '. ' + label + '</div>';
      }).join('');
    });
  }

  // Review page: items + address.
  function drawReview() {
    document.getElementById('review-items').innerHTML = getCart().map(function (l) {
      var p = productById(l.id);
      return '<div class="sum-row"><span>' + p.emoji + ' ' + p.name + ' × ' + l.qty + '</span><span>' + money(p.price * l.qty) + '</span></div>';
    }).join('') || '<p class="muted">Nothing in your cart.</p>';

    var s = load(SHIP_KEY, null);
    document.getElementById('review-address').innerHTML = s
      ? esc(s.name) + '<br>' + esc(s.address) + '<br>' + esc(s.city) + ' ' + esc(s.zip) + '<br>' +
        (s.method === 'express' ? 'Express shipping' : 'Standard shipping')
      : 'No address entered.';
  }

  function drawAll() {
    drawBadge(); drawCart(); drawSummary(); drawSteps(); drawReview();
    document.getElementById('promo-input').value = load(PROMO_KEY, '');
  }


  // ---------- 4. CLICKS AND FORMS ----------
  // One listener on the whole page handles the buttons that get redrawn
  // (product cards, quantity buttons...). This trick is called "event delegation".
  document.addEventListener('click', function (event) {
    var btn = event.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('add-to-cart')) {
      addToCart(btn.getAttribute('data-product'));
      track('Add To Cart', { product: btn.getAttribute('data-product') });
      drawAll();
      window.showToast('Added to cart');
    }
    var line = btn.closest('.cart-line');
    if (line) {
      var id = line.getAttribute('data-product');
      if (btn.classList.contains('qty-plus'))    changeQty(id, 1);
      if (btn.classList.contains('qty-minus'))   changeQty(id, -1);
      if (btn.classList.contains('cart-remove')) removeLine(id);
      drawAll();
    }
  });

  // Promo code
  document.getElementById('promo-apply').addEventListener('click', function () {
    var code = document.getElementById('promo-input').value.trim().toUpperCase();
    var msg = document.getElementById('promo-msg');
    if (PROMO_CODES[code]) {
      save(PROMO_KEY, code);
      msg.textContent = '✔ ' + code + ' applied';
    } else {
      localStorage.removeItem(PROMO_KEY);
      msg.textContent = code ? '✖ Not a valid code' : '';
    }
    drawSummary();
  });

  // "Checkout" only works with something in the cart.
  document.getElementById('cart-checkout').addEventListener('click', function () {
    if (!cartCount()) { window.showToast('Your cart is empty'); return; }
    location.hash = 'checkout-shipping';
  });

  // Shipping form: save the address, go to payment.
  document.getElementById('shipping-form').addEventListener('submit', function (event) {
    event.preventDefault();
    save(SHIP_KEY, {
      name:    document.getElementById('ship-name').value.trim(),
      address: document.getElementById('ship-address').value.trim(),
      city:    document.getElementById('ship-city').value.trim(),
      zip:     document.getElementById('ship-zip').value.trim(),
      method:  document.querySelector('input[name="ship-method"]:checked').value
    });
    location.hash = 'checkout-payment';
  });

  // Payment form: choosing "invoice" hides the card fields. Nothing is saved.
  document.querySelectorAll('input[name="pay-method"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      var useCard = document.querySelector('input[name="pay-method"]:checked').value === 'card';
      document.getElementById('card-fields').classList.toggle('hidden', !useCard);
      document.querySelectorAll('#card-fields input').forEach(function (i) { i.required = useCard; });
    });
  });
  document.getElementById('payment-form').addEventListener('submit', function (event) {
    event.preventDefault();
    location.hash = 'checkout-review';
  });

  // Place order: remember the total, empty the cart, show the thank-you page.
  document.getElementById('place-order').addEventListener('click', function () {
    if (!cartCount()) { window.showToast('Your cart is empty'); return; }
    var t = totals();
    var orderNumber = 'NV-' + Math.floor(100000 + Math.random() * 900000);
    track('Order Placed', { order: orderNumber, total: t.total });
    document.getElementById('done-order').textContent = orderNumber;
    document.getElementById('done-total').textContent = money(t.total);
    save(CART_KEY, []);
    localStorage.removeItem(PROMO_KEY);
    drawAll();
    location.hash = 'checkout-done';
  });


  // ---------- 5. START-UP ----------
  drawProducts();
  drawAll();
  window.addEventListener('hashchange', drawAll);   // refresh whenever you change pages

})();
