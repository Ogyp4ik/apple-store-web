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

// Загружаем товары
async function loadProducts() {
    const productsDiv = document.getElementById('products');
    productsDiv.innerHTML = '<div class="loading">Загрузка товаров...</div>';
    
    try {
        const snapshot = await db.collection('products').get();
        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        if (products.length === 0) {
            productsDiv.innerHTML = '<div class="empty">Товаров пока нет</div>';
            return;
        }
        
        productsDiv.innerHTML = '';
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.image || 'https://via.placeholder.com/300'}" alt="${product.name}">
                <h2>${product.name}</h2>
                <p class="description">${product.description || ''}</p>
                <div class="specs">
                    <p>💾 Память: ${product.storage || '—'}</p>
                    <p>🎨 Цвет: ${product.color || '—'}</p>
                </div>
                <p class="price">${(product.price || 0).toLocaleString()} ₽</p>
                <button class="buy-btn" data-name="${product.name}" data-storage="${product.storage || ''}" data-color="${product.color || ''}" data-price="${product.price || 0}">Купить</button>
            `;
            productsDiv.appendChild(card);
        });
        
        // Кнопки "Купить"
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const productName = btn.dataset.name;
                const storage = btn.dataset.storage;
                const color = btn.dataset.color;
                const price = parseInt(btn.dataset.price);
                const user = tg.initDataUnsafe?.user;
                
                try {
                    await db.collection('orders').add({
                        userId: user?.id || 0,
                        username: user?.username || 'Не указан',
                        productName: productName,
                        storage: storage,
                        color: color,
                        price: price,
                        date: new Date().toISOString()
                    });
                    tg.showAlert('✅ Заявка отправлена!');
                } catch (error) {
                    console.error(error);
                    tg.showAlert('❌ Ошибка');
                }
            });
        });
        
    } catch (error) {
        console.error('Ошибка:', error);
        productsDiv.innerHTML = '<div class="empty">❌ Ошибка: ' + error.message + '</div>';
    }
}

// Запускаем
loadProducts();
