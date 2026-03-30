// Firebase конфиг
const firebaseConfig = {
    apiKey: "AIzaSyCR01An-gdwysrsNfDoPGV0fQ9Zxmk1S4g",
    authDomain: "yablochniy-e5daf.firebaseapp.com",
    projectId: "yablochniy-e5daf",
    storageBucket: "yablochniy-e5daf.firebasestorage.app",
    messagingSenderId: "909418919751",
    appId: "1:909418919751:web:cc3975c0e62b5ae4703e62"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Получаем данные пользователя
let user = null;
try {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        user = tg.initDataUnsafe.user;
        console.log('✅ Пользователь:', user);
    } else {
        console.warn('⚠️ Пользователь не авторизован');
    }
} catch (e) {
    console.error('❌ Ошибка:', e);
}

// Конфиг Telegram для уведомлений
const TELEGRAM_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";
const GROUP_ID = "-1003850642883";
const ADMIN_IDS = ["7441684316", "1317122793", "1015865721"];

// Функция отправки уведомления
async function sendTelegramNotification(message) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: GROUP_ID, text: message })
        });
        
        for (const adminId of ADMIN_IDS) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: adminId, text: message })
            });
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

// Функция отправки заказа
async function sendOrder(product, btn) {
    const originalText = btn.textContent;
    btn.textContent = '⏳ Отправка...';
    btn.disabled = true;
    
    try {
        const orderData = {
            userId: user?.id || 0,
            username: user?.username || 'Не указан',
            firstName: user?.first_name || '',
            lastName: user?.last_name || '',
            productName: product.name,
            storage: product.storage || '—',
            color: product.color || '—',
            price: product.price || 0,
            date: new Date().toISOString(),
            type: 'product'
        };
        
        await db.collection('orders').add(orderData);
        
        const message = `
🛍 НОВЫЙ ЗАКАЗ!

👤 Клиент: ${orderData.username ? '@' + orderData.username : 'Не указан'}
🆔 ID: ${orderData.userId || '—'}

📱 Товар: ${orderData.productName}
💾 Память: ${orderData.storage}
🎨 Цвет: ${orderData.color}
💰 Сумма: ${orderData.price.toLocaleString()} ₽

📅 Время: ${new Date().toLocaleString('ru-RU')}
        `.trim();
        
        await sendTelegramNotification(message);
        
        if (tg) tg.showAlert('✅ Заявка отправлена!');
        
        btn.textContent = '✅ Отправлено!';
        btn.style.background = '#34c759';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.background = '#007aff';
        }, 3000);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        if (tg) tg.showAlert('❌ Ошибка при отправке');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Функция "Заказ под заказ"
async function sendCustomOrder() {
    try {
        const orderData = {
            userId: user?.id || 0,
            username: user?.username || 'Не указан',
            firstName: user?.first_name || '',
            lastName: user?.last_name || '',
            productName: 'Заказ под заказ',
            storage: '—',
            color: '—',
            price: 0,
            date: new Date().toISOString(),
            type: 'custom'
        };
        
        await db.collection('orders').add(orderData);
        
        const message = `
📦 ЗАКАЗ ПОД ЗАКАЗ!

👤 Клиент: ${orderData.username ? '@' + orderData.username : 'Не указан'}
🆔 ID: ${orderData.userId || '—'}

📝 Пользователь хочет заказать устройство, которого нет в магазине.

📅 Время: ${new Date().toLocaleString('ru-RU')}

💡 Свяжитесь с клиентом для уточнения деталей.
        `.trim();
        
        await sendTelegramNotification(message);
        
        if (tg) tg.showAlert('✅ Заявка отправлена! Мы свяжемся с вами.');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        if (tg) tg.showAlert('❌ Ошибка при отправке');
    }
}

// Показать список категорий
async function showCategories() {
    const productsDiv = document.getElementById('products');
    if (!productsDiv) return;
    
    productsDiv.innerHTML = '<div class="loading">🔄 Загрузка категорий...</div>';
    
    try {
        const snapshot = await db.collection('categories').orderBy('order').get();
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        if (categories.length === 0) {
            productsDiv.innerHTML = '<div class="empty">📭 Категории пока не добавлены</div>';
            addCustomOrderButton();
            return;
        }
        
        productsDiv.innerHTML = '';
        
        categories.forEach(category => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.style.cursor = 'pointer';
            card.onclick = () => showProducts(category.id, category.name);
            
            const categoryImage = category.image || 'https://via.placeholder.com/300?text=' + encodeURIComponent(category.name);
            
            card.innerHTML = `
                <div class="category-image">
                    <img src="${categoryImage}" alt="${escapeHtml(category.name)}" onerror="this.src='https://via.placeholder.com/300?text=${escapeHtml(category.name)}'">
                </div>
                <h3>${escapeHtml(category.name)}</h3>
                <p class="category-count">Нажмите для просмотра</p>
            `;
            productsDiv.appendChild(card);
        });
        
        addCustomOrderButton();
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        productsDiv.innerHTML = `<div class="empty">❌ Ошибка загрузки: ${error.message}</div>`;
        addCustomOrderButton();
    }
}

// Показать товары в категории (с фильтрацией)
async function showProducts(categoryId, categoryName) {
    const productsDiv = document.getElementById('products');
    if (!productsDiv) return;
    
    productsDiv.innerHTML = `
        <div class="back-button" onclick="window.showCategories()">← Назад к категориям</div>
        <div class="loading">🔄 Загрузка товаров...</div>
    `;
    
    try {
        console.log(`🔍 Запрос товаров для категории: ${categoryId} (${categoryName})`);
        
        // Запрос с фильтрацией по categoryId
        const snapshot = await db.collection('products')
            .where('categoryId', '==', categoryId)
            .get();
        
        console.log(`📦 Найдено товаров: ${snapshot.size}`);
        
        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        if (products.length === 0) {
            productsDiv.innerHTML = `
                <div class="back-button" onclick="window.showCategories()">← Назад к категориям</div>
                <div class="empty">📭 В категории "${escapeHtml(categoryName)}" пока нет товаров</div>
            `;
            addCustomOrderButton();
            return;
        }
        
        productsDiv.innerHTML = `
            <div class="back-button" onclick="window.showCategories()">← Назад к категориям</div>
            <h2 class="category-title">${escapeHtml(categoryName)}</h2>
            <div id="products-list"></div>
        `;
        
        const productsList = document.getElementById('products-list');
        
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.image || 'https://via.placeholder.com/300'}" alt="${escapeHtml(product.name)}" onerror="this.src='https://via.placeholder.com/300'">
                <h2>${escapeHtml(product.name)}</h2>
                <p class="description">${escapeHtml(product.description || '')}</p>
                <div class="specs">
                    <p>💾 Память: ${escapeHtml(product.storage || '—')}</p>
                    <p>🎨 Цвет: ${escapeHtml(product.color || '—')}</p>
                </div>
                <p class="price">${(product.price || 0).toLocaleString()} ₽</p>
                <button class="buy-btn" data-name="${escapeHtml(product.name)}" data-storage="${escapeHtml(product.storage || '—')}" data-color="${escapeHtml(product.color || '—')}" data-price="${product.price || 0}">🛍 Купить</button>
            `;
            productsList.appendChild(card);
        });
        
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const productData = {
                    name: btn.dataset.name,
                    storage: btn.dataset.storage,
                    color: btn.dataset.color,
                    price: parseInt(btn.dataset.price)
                };
                await sendOrder(productData, btn);
            });
        });
        
        addCustomOrderButton();
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        productsDiv.innerHTML = `
            <div class="back-button" onclick="window.showCategories()">← Назад к категориям</div>
            <div class="empty">❌ Ошибка загрузки: ${error.message}</div>
        `;
        addCustomOrderButton();
    }
}

// Добавить кнопку "Заказ под заказ"
function addCustomOrderButton() {
    const productsDiv = document.getElementById('products');
    if (!productsDiv) return;
    
    const oldBtn = document.getElementById('custom-order-btn');
    if (oldBtn) oldBtn.remove();
    
    const customOrderBtn = document.createElement('button');
    customOrderBtn.id = 'custom-order-btn';
    customOrderBtn.textContent = '📦 Заказать под заказ';
    customOrderBtn.className = 'custom-order-btn';
    customOrderBtn.style.cssText = `
        width: 100%;
        padding: 15px;
        margin-top: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
    `;
    customOrderBtn.onmouseover = () => customOrderBtn.style.transform = 'scale(1.02)';
    customOrderBtn.onmouseout = () => customOrderBtn.style.transform = 'scale(1)';
    customOrderBtn.onclick = () => sendCustomOrder();
    
    productsDiv.appendChild(customOrderBtn);
}

// Экранирование HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Глобальные функции для навигации
window.showCategories = showCategories;
window.showProducts = showProducts;

// Запускаем показ категорий
showCategories();
