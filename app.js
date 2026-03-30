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

// Конфиг Telegram
const TELEGRAM_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";
const GROUP_ID = "-1003850642883";
const ADMIN_IDS = ["7441684316", "1317122793", "1015865721"];

// Функция отправки уведомления в Telegram
async function sendTelegramNotification(message) {
    try {
        // Отправляем в группу
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: GROUP_ID, text: message })
        });
        
        // Отправляем админам
        for (const adminId of ADMIN_IDS) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: adminId, text: message })
            });
        }
        
        console.log('✅ Уведомление отправлено');
    } catch (error) {
        console.error('❌ Ошибка отправки:', error);
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
        
        // Сохраняем в Firebase
        await db.collection('orders').add(orderData);
        console.log('✅ Заказ сохранен');
        
        // Формируем сообщение
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
        console.log('✅ Заказ под заказ сохранен');
        
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

// Загружаем товары
async function loadProducts() {
    const productsDiv = document.getElementById('products');
    if (!productsDiv) return;
    
    productsDiv.innerHTML = '<div class="loading">🔄 Загрузка товаров...</div>';
    
    try {
        const snapshot = await db.collection('products').get();
        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        if (products.length === 0) {
            productsDiv.innerHTML = '<div class="empty">📭 Товаров пока нет</div>';
        } else {
            productsDiv.innerHTML = '';
            products.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <img src="${product.image || 'https://via.placeholder.com/300'}" alt="${product.name}">
                    <h2>${escapeHtml(product.name)}</h2>
                    <p class="description">${escapeHtml(product.description || '')}</p>
                    <div class="specs">
                        <p>💾 Память: ${escapeHtml(product.storage || '—')}</p>
                        <p>🎨 Цвет: ${escapeHtml(product.color || '—')}</p>
                    </div>
                    <p class="price">${(product.price || 0).toLocaleString()} ₽</p>
                    <button class="buy-btn" data-name="${escapeHtml(product.name)}" data-storage="${escapeHtml(product.storage || '')}" data-color="${escapeHtml(product.color || '')}" data-price="${product.price || 0}">🛍 Купить</button>
                `;
                productsDiv.appendChild(card);
            });
        }
        
        // Добавляем кнопку "Заказ под заказ"
        const customOrderBtn = document.createElement('button');
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
        
        productsDiv.after(customOrderBtn);
        
        // Обработчики кнопок "Купить"
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
        
        console.log(`✅ Загружено ${products.length} товаров`);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        productsDiv.innerHTML = `<div class="empty">❌ Ошибка загрузки: ${error.message}</div>`;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Запускаем
loadProducts();
