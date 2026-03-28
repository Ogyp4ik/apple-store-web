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
        console.warn('⚠️ Пользователь не авторизован в Telegram');
    }
} catch (e) {
    console.error('❌ Ошибка получения пользователя:', e);
}

// Функция отправки заявки
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
            storage: product.storage,
            color: product.color,
            price: product.price,
            date: new Date().toISOString()
        };
        
        // Сохраняем заказ в Firebase
        await db.collection('orders').add(orderData);
        console.log('✅ Заказ сохранен в Firebase');
        
        // Отправляем уведомление через бота
        try {
            const response = await fetch('https://apple-store-bot-production.up.railway.app/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                console.log('✅ Уведомление отправлено боту');
            } else {
                console.log('⚠️ Бот ответил ошибкой:', await response.text());
            }
        } catch (e) {
            console.log('⚠️ Не удалось отправить уведомление боту:', e.message);
        }
        
        // Уведомляем пользователя
        if (tg) {
            tg.showAlert('✅ Заявка отправлена! Скоро с вами свяжутся.');
        } else {
            alert('✅ Заявка отправлена!');
        }
        
        btn.textContent = '✅ Отправлено!';
        btn.style.background = '#34c759';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.background = '#007aff';
        }, 3000);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        if (tg) {
            tg.showAlert('❌ Ошибка при отправке. Попробуйте позже.');
        } else {
            alert('❌ Ошибка при отправке');
        }
        btn.textContent = originalText;
        btn.disabled = false;
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
            return;
        }
        
        productsDiv.innerHTML = '';
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.image || 'https://via.placeholder.com/300'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300'">
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
        
        // Кнопки "Купить"
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
        console.error('❌ Ошибка загрузки:', error);
        productsDiv.innerHTML = `<div class="empty">❌ Ошибка загрузки: ${error.message}</div>`;
    }
}

// Простая функция для экранирования HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Запускаем загрузку товаров
loadProducts();
