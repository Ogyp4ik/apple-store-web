// Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCR01An-gdwysrsNfDoPGV0fQ9Zxmk1S4g",
    authDomain: "yablochniy-e5daf.firebaseapp.com",
    projectId: "yablochniy-e5daf",
    storageBucket: "yablochniy-e5daf.firebasestorage.app",
    messagingSenderId: "909418919751",
    appId: "1:909418919751:web:cc3975c0e62b5ae4703e62"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Telegram уведомления (только в группу)
const TELEGRAM_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";
const GROUP_CHAT_ID = "-1003850642883";

let user = null;
try {
    if (tg.initDataUnsafe?.user) {
        user = tg.initDataUnsafe.user;
    }
} catch(e) {}

async function sendTelegramNotification(message) {
    if (!GROUP_CHAT_ID) return;
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: GROUP_CHAT_ID, text: message })
        });
    } catch(e) { console.error(e); }
}

async function sendOrder(product, btn) {
    const originalText = btn.textContent;
    btn.textContent = 'Отправка...';
    btn.disabled = true;

    try {
        const orderData = {
            userId: user?.id || 0,
            username: user?.username || 'Не указан',
            productName: product.name,
            storage: product.storage || '—',
            color: product.color || '—',
            price: product.price,
            date: new Date().toISOString(),
            type: 'product'
        };
        await db.collection('orders').add(orderData);
        const message = `🛍 НОВЫЙ ЗАКАЗ!\n👤 ${orderData.username}\n📱 ${orderData.productName}\n💾 ${orderData.storage}\n🎨 ${orderData.color}\n💰 ${orderData.price.toLocaleString()} ₽`;
        await sendTelegramNotification(message);
        tg.showAlert('✅ Заявка отправлена!');
        btn.textContent = '✅ Отправлено!';
        btn.style.background = '#34c759';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.background = '';
        }, 2000);
    } catch(e) {
        console.error(e);
        tg.showAlert('❌ Ошибка');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function sendCustomOrder(comment) {
    try {
        const orderData = {
            userId: user?.id || 0,
            username: user?.username || 'Не указан',
            productName: 'Заказ под заказ',
            storage: '—',
            color: '—',
            price: 0,
            comment: comment,
            date: new Date().toISOString(),
            type: 'custom'
        };
        await db.collection('orders').add(orderData);
        const message = `📦 ЗАКАЗ ПОД ЗАКАЗ!\n👤 ${orderData.username}\n📝 ${comment}`;
        await sendTelegramNotification(message);
        tg.showAlert('✅ Заявка принята!');
    } catch(e) {
        console.error(e);
        tg.showAlert('❌ Ошибка');
    }
}

// ----------------------------------------------------------------
// ВАЖНО: #app — это обёртка со стилями (padding, max-width).
// Мы НЕ перезаписываем его innerHTML напрямую, а рендерим внутрь.
// Модалка и кнопка "Заказать" живут вне #app — не трогаем.
// ----------------------------------------------------------------

function getApp() {
    return document.getElementById('app');
}

async function showCategories() {
    const app = getApp();
    app.innerHTML = '<div class="loading">Загрузка категорий...</div>';

    try {
        const snapshot = await db.collection('categories').orderBy('order').get();
        const categories = [];
        snapshot.forEach(doc => categories.push({ id: doc.id, ...doc.data() }));

        if (!categories.length) {
            app.innerHTML = '<div class="empty">Категории пока не добавлены</div>';
            return;
        }

        // Строим шапку + сетку внутри #app (который уже имеет нужный padding/max-width)
        app.innerHTML = `
            <div class="header">
                <h1>Яблочный</h1>
            </div>
            <div class="categories-grid" id="categoriesGrid"></div>
        `;

        const grid = document.getElementById('categoriesGrid');
        categories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.innerHTML = `
                <div class="category-image">
                    <img src="${cat.image || 'https://placehold.co/200x200?text=?'}" alt="${cat.name}" loading="lazy">
                </div>
                <h3>${cat.name}</h3>
            `;
            card.onclick = () => showProducts(cat.id, cat.name);
            grid.appendChild(card);
        });

    } catch(e) {
        console.error('showCategories error:', e);
        app.innerHTML = '<div class="empty">Ошибка загрузки категорий</div>';
    }
}

async function showProducts(categoryId, categoryName) {
    const app = getApp();

    // Сразу показываем nav + спиннер
    app.innerHTML = `
        <div class="nav-bar">
            <button class="back-btn" onclick="showCategories()">←</button>
            <h2>${categoryName}</h2>
        </div>
        <div class="loading">Загрузка товаров...</div>
    `;

    try {
        // Запрос товаров по categoryId (строка — doc.id категории)
        const snapshot = await db.collection('products')
            .where('categoryId', '==', categoryId)
            .get();

        const products = [];
        snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

        console.log(`[showProducts] categoryId="${categoryId}", найдено товаров: ${products.length}`);

        if (!products.length) {
            // Пробуем fallback: возможно categoryId хранится как число
            const snapshotNum = await db.collection('products')
                .where('categoryId', '==', Number(categoryId))
                .get();
            snapshotNum.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
            console.log(`[showProducts] fallback (number), найдено: ${snapshotNum.size}`);
        }

        if (!products.length) {
            app.innerHTML = `
                <div class="nav-bar">
                    <button class="back-btn" onclick="showCategories()">←</button>
                    <h2>${categoryName}</h2>
                </div>
                <div class="empty">В этой категории пока нет товаров</div>
            `;
            return;
        }

        app.innerHTML = `
            <div class="nav-bar">
                <button class="back-btn" onclick="showCategories()">←</button>
                <h2>${categoryName}</h2>
            </div>
            <div class="products-list" id="productsList"></div>
        `;

        const list = document.getElementById('productsList');

        products.forEach(product => {
            const specs = [
                product.storage && product.storage !== '—' ? `Память: ${product.storage}` : '',
                product.color   && product.color   !== '—' ? `Цвет: ${product.color}`   : ''
            ].filter(Boolean).join(' · ');

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image">
                    <img src="${product.image || 'https://placehold.co/400x300?text=No+Image'}" alt="${product.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <div class="product-title">${product.name}</div>
                    <div class="product-price">${(product.price || 0).toLocaleString()} ₽</div>
                    ${specs ? `<div class="product-specs">${specs}</div>` : ''}
                    <button class="buy-btn" data-product='${JSON.stringify(product).replace(/'/g, "&#39;")}'>Купить</button>
                </div>
            `;
            list.appendChild(card);
        });

        // Вешаем обработчики на кнопки "Купить"
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const product = JSON.parse(btn.dataset.product);
                sendOrder(product, btn);
            });
        });

    } catch(e) {
        console.error('showProducts error:', e);
        app.innerHTML = `
            <div class="nav-bar">
                <button class="back-btn" onclick="showCategories()">←</button>
                <h2>${categoryName}</h2>
            </div>
            <div class="empty">Ошибка загрузки товаров</div>
        `;
    }
}

window.showCategories = showCategories;
window.showProducts = showProducts;

// ---- Модалка ----
const modal = document.getElementById('customModal');

document.getElementById('customOrderBtn').addEventListener('click', () => {
    modal.classList.add('active');
});
document.getElementById('closeModalBtn').addEventListener('click', () => {
    modal.classList.remove('active');
});
document.getElementById('submitCustomBtn').addEventListener('click', async () => {
    const comment = document.getElementById('customComment').value.trim();
    if (!comment) {
        tg.showAlert('Напишите, что вы ищете');
        return;
    }
    await sendCustomOrder(comment);
    modal.classList.remove('active');
    document.getElementById('customComment').value = '';
});

// Старт
showCategories();
