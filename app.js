// Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Данные (в реальности подключаешь Firebase)
const categories = [
    { id: 'iphone', name: 'iPhone', image: 'https://cdn-icons-png.flaticon.com/512/1791/1791308.png' },
    { id: 'ipad', name: 'iPad', image: 'https://cdn-icons-png.flaticon.com/512/1791/1791262.png' },
    { id: 'macbook', name: 'MacBook', image: 'https://cdn-icons-png.flaticon.com/512/1791/1791257.png' }
];

const products = {
    iphone: [
        { id: 1, name: 'iPhone 17 Pro', price: 129900, storage: '256GB', color: 'Natural Titanium', image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-model-unselect-gallery-2-202409?wid=512' },
        { id: 2, name: 'iPhone 17', price: 99900, storage: '128GB', color: 'Black', image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-model-unselect-gallery-2-202409?wid=512' }
    ],
    ipad: [
        { id: 3, name: 'iPad Pro 13"', price: 149900, storage: '512GB', color: 'Silver', image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-pro-13-select-wifi-spacegray-202410?wid=512' }
    ],
    macbook: [
        { id: 4, name: 'MacBook Pro 14"', price: 199900, storage: '1TB', color: 'Space Gray', image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202410?wid=512' }
    ]
};

let currentCategoryId = null;
const app = document.getElementById('app');
const modal = document.getElementById('customModal');

// Рендер категорий
function renderCategories() {
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
            <div class="category-image"><img src="${cat.image}" alt="${cat.name}"></div>
            <h3>${cat.name}</h3>
        `;
        card.onclick = () => renderProducts(cat.id, cat.name);
        grid.appendChild(card);
    });
}

// Рендер товаров категории
function renderProducts(categoryId, categoryName) {
    currentCategoryId = categoryId;
    const items = products[categoryId] || [];
    if (!items.length) {
        app.innerHTML = `
            <div class="nav-bar">
                <button class="back-btn" onclick="renderCategories()">←</button>
                <h2>${categoryName}</h2>
            </div>
            <div class="empty">В этой категории пока нет товаров</div>
        `;
        return;
    }
    app.innerHTML = `
        <div class="nav-bar">
            <button class="back-btn" onclick="renderCategories()">←</button>
            <h2>${categoryName}</h2>
        </div>
        <div class="products-list" id="productsList"></div>
    `;
    const list = document.getElementById('productsList');
    items.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image"><img src="${product.image}" alt="${product.name}" onerror="this.src='https://placehold.co/400x300?text=No+Image'"></div>
            <div class="product-info">
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price.toLocaleString()} ₽</div>
                <div class="product-specs">${product.storage ? `Память: ${product.storage} | ` : ''}${product.color ? `Цвет: ${product.color}` : ''}</div>
                <button class="buy-btn" data-product='${JSON.stringify(product)}'>Купить</button>
            </div>
        `;
        list.appendChild(card);
    });
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const product = JSON.parse(btn.dataset.product);
            tg.showAlert(`✅ Заявка отправлена!\n\n${product.name}\n${product.storage || ''} ${product.color || ''}\n${product.price.toLocaleString()} ₽`);
            console.log('Заказ:', product);
        });
    });
}

// Модалка для заказа под заказ
document.getElementById('customOrderBtn').addEventListener('click', () => {
    modal.classList.add('active');
});
document.getElementById('closeModalBtn').addEventListener('click', () => {
    modal.classList.remove('active');
});
document.getElementById('submitCustomBtn').addEventListener('click', () => {
    const comment = document.getElementById('customComment').value;
    if (comment.trim()) {
        tg.showAlert(`✅ Заявка принята!\nВаш запрос: ${comment.substring(0, 100)}`);
        console.log('Заказ под заказ:', comment);
    } else {
        tg.showAlert('Пожалуйста, опишите, что вы ищете');
    }
    modal.classList.remove('active');
    document.getElementById('customComment').value = '';
});

// Старт
renderCategories();
