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

const tg = window.Telegram.WebApp;
tg.expand();

let user = null;
try {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        user = tg.initDataUnsafe.user;
    }
} catch (e) {}

const TELEGRAM_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";
const GROUP_ID = "-1003850642883";
const ADMIN_IDS = ["7441684316", "1317122793", "1015865721"];

async function sendOrder(product, btn) {
    const originalText = btn.textContent;
    btn.textContent = '⏳ Отправка...';
    btn.disabled = true;
    
    try {
        const orderData = {
            userId: user?.id || 0,
            username: user?.username || 'Не указан',
            productName: product.name,
            storage: product.storage,
            color: product.color,
            price: product.price,
            date: new Date().toISOString()
        };
        
        await db.collection('orders').add(orderData);
        
        const message = `🛍 НОВЫЙ ЗАКАЗ!\n\n👤 Клиент: @${orderData.username}\n📱 Товар: ${orderData.productName}\n💾 Память: ${orderData.storage}\n🎨 Цвет: ${orderData.color}\n💰 Сумма: ${orderData.price.toLocaleString()} ₽`;
        
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
        
        if (tg) tg.showAlert('✅ Заявка отправлена!');
        
        btn.textContent = '✅ Отправлено!';
        btn.style.background = '#34c759';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.background = '#007aff';
        }, 3000);
        
    } catch (error) {
        console.error(error);
        if (tg) tg.showAlert('❌ Ошибка');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function loadProducts() {
    const productsDiv = document.getElementById('products');
    if (!productsDiv) return;
    productsDiv.innerHTML = '<div class="loading">🔄 Загрузка...</div>';
    
    try {
        const snapshot = await db.collection('products').get();
        const products = [];
        snapshot.forEach(doc => products.push(doc.data()));
        
        if (products.length === 0) {
            productsDiv.innerHTML = '<div class="empty">📭 Товаров нет</div>';
            return;
        }
        
        productsDiv.innerHTML = '';
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.image || 'https://via.placeholder.com/300'}">
                <h2>${product.name}</h2>
                <p>${product.description || ''}</p>
                <p>💾 ${product.storage} | 🎨 ${product.color}</p>
                <p class="price">${product.price.toLocaleString()} ₽</p>
                <button class="buy-btn" data-name="${product.name}" data-storage="${product.storage}" data-color="${product.color}" data-price="${product.price}">🛍 Купить</button>
            `;
            productsDiv.appendChild(card);
        });
        
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await sendOrder({
                    name: btn.dataset.name,
                    storage: btn.dataset.storage,
                    color: btn.dataset.color,
                    price: parseInt(btn.dataset.price)
                }, btn);
            });
        });
        
    } catch (error) {
        productsDiv.innerHTML = '<div class="empty">❌ Ошибка загрузки</div>';
    }
}

loadProducts();
