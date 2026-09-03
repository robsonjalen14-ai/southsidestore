const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 80;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'southside-rp-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const STORE_NAME = 'Southside RP';
const STORE_DISCORD = 'https://discord.gg/pwRPhNWU7T';
const FIVEM_SERVER = '185.228.81.67';
const FIVEM_PORT = 30120;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '';
const DISCORD_LOG_CHANNEL = process.env.DISCORD_LOG_CHANNEL || '';

const products = [
    { id: 1, name: "Personal Vehicle (1 Of 1)", description: "Unlock your first personal vehicle slot.", price: 15.00, icon: "🏎️", category: "Vehicles", qty: false },
    { id: 2, name: "Personal Vehicle (2 Of 2)", description: "Choose the vehicle that fits your style. Lore Friendly, clean, realistic setup.", price: 10.00, icon: "🚗", category: "Vehicles", qty: true },
    { id: 3, name: "Restaurants Whitelist", description: "Access to roleplay as restaurant staff.", price: 20.00, icon: "🍽️", category: "Whitelists", qty: false },
    { id: 4, name: "Mechanics Whitelist", description: "Access to roleplay as a mechanic.", price: 25.00, icon: "🔧", category: "Whitelists", qty: false },
    { id: 5, name: "Buy A Gang", description: "Access to gang roleplay activities.", price: 25.00, icon: "⚔️", category: "Whitelists", qty: true },
    { id: 6, name: "Custom Pants", description: "Custom pants for your character.", price: 5.00, icon: "👖", category: "Clothing", qty: false },
    { id: 7, name: "Custom Shirt", description: "Custom shirt for your character.", price: 5.00, icon: "👔", category: "Clothing", qty: false },
    { id: 8, name: "Custom Gang Vest", description: "Custom gang vest for your character.", price: 15.00, icon: "🦺", category: "Clothing", qty: false },
    { id: 9, name: "Custom Set (Pants and Shirt)", description: "Custom pants and shirt bundle.", price: 10.00, icon: "👕", category: "Clothing", qty: false },
    { id: 10, name: "Custom Chain", description: "Custom chain for your character.", price: 15.00, icon: "⛓️", category: "Clothing", qty: false }
];

app.use((req, res, next) => {
    if (!req.session.cart) req.session.cart = [];
    res.locals.cart = req.session.cart;
    res.locals.cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);
    res.locals.storeName = STORE_NAME;
    res.locals.discord = STORE_DISCORD;
    res.locals.tebexStore = '#';
    next();
});

app.get('/', (req, res) => {
    const featured = products.slice(0, 4);
    res.render('index', { products: featured, allProducts: products });
});

app.get('/store', (req, res) => {
    const category = req.query.category || 'all';
    const filtered = category === 'all' ? products : products.filter(p => p.category === category);
    res.render('store', { products: filtered, category });
});

app.get('/product/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (!product) return res.redirect('/store');
    res.render('product', { product });
});

app.post('/cart/add', (req, res) => {
    const { productId, quantity } = req.body;
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const existing = req.session.cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += parseInt(quantity) || 1;
    } else {
        req.session.cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: parseInt(quantity) || 1,
            icon: product.icon
        });
    }
    res.json({ success: true, cartCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0) });
});

app.post('/cart/remove', (req, res) => {
    const { productId } = req.body;
    req.session.cart = req.session.cart.filter(item => item.id !== parseInt(productId));
    res.json({ success: true, cartCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0) });
});

app.post('/cart/update', (req, res) => {
    const { productId, quantity } = req.body;
    const item = req.session.cart.find(item => item.id === parseInt(productId));
    if (item) {
        if (parseInt(quantity) <= 0) {
            req.session.cart = req.session.cart.filter(i => i.id !== parseInt(productId));
        } else {
            item.quantity = parseInt(quantity);
        }
    }
    res.json({ success: true });
});

app.get('/cart', (req, res) => {
    const total = req.session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.render('cart', { cart: req.session.cart, total });
});

app.get('/checkout', (req, res) => {
    if (req.session.cart.length === 0) return res.redirect('/cart');
    const total = req.session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.render('checkout', { cart: req.session.cart, total });
});

app.post('/checkout', (req, res) => {
    const { ign, discord, email, payment, cardNumber, cardExpiry, cardCvv, cardName } = req.body;
    const total = req.session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const items = req.session.cart.map(item => `${item.name} x${item.quantity} (£${(item.price * item.quantity).toFixed(2)})`).join('\n');

    const fields = [
        { name: 'In-Game Name', value: ign || 'N/A', inline: true },
        { name: 'Discord', value: discord || 'N/A', inline: true },
        { name: 'Email', value: email || 'N/A', inline: true },
        { name: 'Items', value: items, inline: false },
        { name: 'Total', value: `\u00A3${total.toFixed(2)}`, inline: true },
        { name: 'Payment Method', value: payment || 'N/A', inline: true }
    ];

    if (payment === 'credit_card' && cardNumber) {
        const masked = '****' + cardNumber.slice(-4);
        fields.push({ name: 'Card', value: `${masked} (Exp: ${cardExpiry || 'N/A'})`, inline: true });
        fields.push({ name: 'Card Name', value: cardName || 'N/A', inline: true });
    }

    if (payment === 'bank_transfer') {
        fields.push({ name: 'Note', value: 'Open a Discord ticket to complete bank transfer', inline: false });
    }

    const data = JSON.stringify({
        embeds: [{
            title: 'New Store Order',
            color: 0xdc143c,
            fields: fields,
            timestamp: new Date().toISOString()
        }]
    });

    const apiReq = https.request({
        hostname: 'discord.com',
        path: `/api/v10/channels/${DISCORD_LOG_CHANNEL}/messages`,
        method: 'POST',
        headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    }, () => {});
    apiReq.on('error', () => {});
    apiReq.write(data);
    apiReq.end();

    req.session.cart = [];
    res.render('success', { ign, total, payment });
});

app.get('/api/products', (req, res) => { res.json(products); });
app.get('/api/cart/count', (req, res) => { res.json({ count: req.session.cart.reduce((sum, item) => sum + item.quantity, 0) }); });

app.get('/api/check-player/:id', (req, res) => {
    const playerId = req.params.id;
    const url = `http://${FIVEM_SERVER}:${FIVEM_PORT}/players.json`;
    http.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            try {
                const players = JSON.parse(data);
                const found = players.find(p => String(p.id) === String(playerId));
                if (found) {
                    res.json({ online: true, name: found.name || 'Unknown' });
                } else {
                    res.json({ online: false });
                }
            } catch (e) {
                res.json({ online: false, error: 'Could not parse server data' });
            }
        });
    }).on('error', (e) => {
        res.json({ online: false, error: 'Could not connect to server' });
    });
});

app.get('/api/check-discord/:username', (req, res) => {
    const username = req.params.username;
    const options = {
        hostname: 'discord.com',
        path: `/api/v10/guilds/${DISCORD_GUILD_ID}/members/search?query=${encodeURIComponent(username)}&limit=5`,
        method: 'GET',
        headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };
    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            try {
                const members = JSON.parse(data);
                if (Array.isArray(members) && members.length > 0) {
                    const match = members.find(m => {
                        const dn = (m.nick || '').toLowerCase();
                        const un = (m.user && m.user.username || '').toLowerCase();
                        return dn === username.toLowerCase() || un === username.toLowerCase();
                    });
                    if (match) {
                        res.json({ inServer: true, displayName: match.nick || match.user.username });
                    } else {
                        res.json({ inServer: true, displayName: members[0].nick || members[0].user.username });
                    }
                } else {
                    res.json({ inServer: false });
                }
            } catch (e) {
                res.json({ inServer: false, error: 'Could not parse Discord data' });
            }
        });
    });
    request.on('error', (e) => {
        res.json({ inServer: false, error: 'Could not connect to Discord' });
    });
    request.end();
});

app.listen(PORT, () => {
    console.log(`Southside Store running on port ${PORT}`);
});
