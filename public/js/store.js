function addToCart(productId) {
    var qtyEl = document.getElementById('qty-' + productId);
    var quantity = qtyEl ? parseInt(qtyEl.value) : 1;

    fetch('/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: productId, quantity: quantity })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            var el = document.getElementById('cartCount');
            if (el) el.textContent = data.cartCount;
            showToast('Added to cart!');
        }
    })
    .catch(function(err) {
        showToast('Error adding to cart');
    });
}

function removeFromCart(productId) {
    fetch('/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: productId })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) location.reload();
    });
}

function updateCart(productId, quantity) {
    fetch('/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: productId, quantity: quantity })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) location.reload();
    });
}

function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}
