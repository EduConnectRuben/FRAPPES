document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // 1. ESTADO GLOBAL DE LA APLICACIÓN
    // ===================================================================
    
    const initialMenuItems = [
        {"id":1,"name":"Frappé de Fresa","category":"frappes","price":8.00,"description":"Dulce y refrescante, hecho con fresas naturales.","image":"images/frappe_fresa.png","stock":15},
        {"id":2,"name":"Frappé de Naranja","category":"frappes","price":8.00,"description":"Un toque cítrico y helado para recargar energías.","image":"images/frappe_naranja.png","stock":15},
        {"id":3,"name":"Frappé de Chocolate","category":"frappes","price":8.00,"description":"Cremoso e intenso, para los amantes del chocolate.","image":"images/frappe_chocolate.png","stock":15},
        {"id":4,"name":"Frappé de Coco","category":"frappes","price":8.00,"description":"Sabor tropical que te transportará a la playa.","image":"images/frappe_coco.png","stock":15},
        {"id":5,"name":"Combo 2x1 Frappés","category":"combos","price":15.00,"description":"¡Lleva dos frappés! Elige tus sabores favoritos.","image":"images/combo.png","stock":15},
        {"id":6,"name":"Café Caliente","category":"calientes","price":5.00,"description":"El clásico café de grano para empezar bien el día.","image":"images/cafe.png","stock":15},
        {"id":7,"name":"Té Caliente","category":"calientes","price":3.00,"description":"Una infusión caliente para relajarte.","image":"images/te.png","stock":15}
    ];

    let menuItems = []; 
    let cart = [];
    let pdfGenerator = null;

    function initApp() {
        loadStockData();
        loadCartFromStorage();
        setupAllPages();
    }
    
    function loadStockData() {
        const storedStock = localStorage.getItem('productStock');
        if (storedStock) {
            menuItems = JSON.parse(storedStock);
        } else {
            menuItems = initialMenuItems;
            localStorage.setItem('productStock', JSON.stringify(menuItems));
        }
    }

    function setupAllPages() {
        setupNavigationAndLogin();
        setupSuccessModal();
        updateCartCounter();
        setupMenuPage();
        setupCartPage();
        setupReservationPage();
    }

    const loadCartFromStorage = () => cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
    const saveCartToStorage = () => { localStorage.setItem('shoppingCart', JSON.stringify(cart)); updateCartCounter(); };

    const addToCart = (itemId) => {
        const itemInMenu = menuItems.find(i => i.id === itemId);
        const itemInCart = cart.find(i => i.id === itemId);
        const quantityInCart = itemInCart ? itemInCart.quantity : 0;
        if (quantityInCart >= itemInMenu.stock) return showNotification(`No hay más stock de ${itemInMenu.name}`, 'error');
        if (itemInCart) itemInCart.quantity++; else cart.push({ ...itemInMenu, quantity: 1 });
        showNotification(`${itemInMenu.name} añadido al carrito!`);
        saveCartToStorage();
        renderMenu();
    };

    const updateCartQuantity = (itemId, newQuantity) => {
        const cartItem = cart.find(i => i.id === itemId);
        if (!cartItem) return;
        const itemInMenu = menuItems.find(i => i.id === itemId);
        if (newQuantity > itemInMenu.stock) newQuantity = itemInMenu.stock;
        if (newQuantity <= 0) cart = cart.filter(i => i.id !== itemId); else cartItem.quantity = newQuantity;
        saveCartToStorage();
        renderCartPage();
        renderMenu();
    };
    
    const updateCartCounter = () => {
        const counter = document.getElementById('cart-counter');
        if (counter) counter.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    };

    const updateStockAfterPurchase = () => {
        cart.forEach(cartItem => {
            const stockItem = menuItems.find(stockItem => stockItem.id === cartItem.id);
            if (stockItem) stockItem.stock -= cartItem.quantity;
        });
        localStorage.setItem('productStock', JSON.stringify(menuItems));
    };

    function renderMenu() {
        const menuGrid = document.getElementById('menu-grid');
        if (!menuGrid) return;
        const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
        const category = document.getElementById('category-filter')?.value || 'all';
        let itemsToRender = menuItems;
        if (category !== 'all') itemsToRender = itemsToRender.filter(item => item.category === category);
        if (searchTerm) itemsToRender = itemsToRender.filter(item => item.name.toLowerCase().includes(searchTerm));
        menuGrid.innerHTML = '';
        if (itemsToRender.length === 0) menuGrid.innerHTML = '<p style="text-align: center;">No se encontraron productos.</p>';
        itemsToRender.forEach(item => {
            const quantityInCart = cart.find(ci => ci.id === item.id)?.quantity || 0;
            const currentStock = item.stock - quantityInCart;
            let stockStatus, stockText;
            if (currentStock > 10) { stockStatus = 'available'; stockText = 'Disponible'; } 
            else if (currentStock > 5) { stockStatus = 'few-left'; stockText = `¡Quedan solo ${currentStock}!`; } 
            else if (currentStock > 0) { stockStatus = 'last-units'; stockText = `¡Últimas ${currentStock} unidades!`; } 
            else { stockStatus = 'not-available'; stockText = 'Agotado'; }
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<img src="${item.image}" alt="${item.name}" class="card-img"><div class="card-body"><h3 class="card-title">${item.name}</h3><p class="card-text">${item.description}</p><div class="card-footer"><div><p class="price">Bs ${item.price.toFixed(2)}</p><span class="stock ${stockStatus}">${stockText}</span></div><button class="add-to-cart-btn" data-id="${item.id}" ${currentStock === 0 ? 'disabled' : ''}>Añadir</button></div></div>`;
            menuGrid.appendChild(card);
        });
    }
    
    function renderCartPage() {
        const cartItemsList = document.getElementById('cart-items-list');
        if (!cartItemsList) return;
        const cartTotalPrice = document.getElementById('cart-total-price');
        const checkoutBtn = document.getElementById('checkout-btn');
        cartItemsList.innerHTML = '';
        if (cart.length === 0) {
            cartItemsList.innerHTML = '<p>Tu carrito está vacío. <a href="menu.html">¡Ve a llenarlo!</a></p>';
            cartTotalPrice.textContent = 'Bs 0.00';
            checkoutBtn.disabled = true;
            return;
        }
        checkoutBtn.disabled = false;
        let total = 0;
        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <p class="cart-item-price">Bs ${item.price.toFixed(2)}</p>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn" data-id="${item.id}" data-action="decrease">-</button>
                        <input type="number" value="${item.quantity}" min="1" max="${item.stock}" data-id="${item.id}" class="quantity-input" readonly>
                        <button class="quantity-btn" data-id="${item.id}" data-action="increase">+</button>
                    </div>
                    <button class="remove-item-btn" data-id="${item.id}">&times;</button>
                </div>`;
            cartItemsList.appendChild(itemElement);
            total += item.price * item.quantity;
        });
        cartTotalPrice.textContent = `Bs ${total.toFixed(2)}`;
    }

    function setupMenuPage() {
        const menuPageContent = document.getElementById('menu-grid');
        if (!menuPageContent) return;
        renderMenu();
        document.getElementById('search-input').addEventListener('input', renderMenu);
        document.getElementById('category-filter').addEventListener('change', renderMenu);
        menuPageContent.addEventListener('click', e => {
            if (e.target.classList.contains('add-to-cart-btn')) addToCart(Number(e.target.dataset.id));
        });
    }

    function setupCartPage() {
        const cartContainer = document.getElementById('cart-container');
        if (!cartContainer) return;

        cartContainer.addEventListener('click', e => {
            const target = e.target;
            const itemId = Number(target.dataset.id);
            if (target.classList.contains('remove-item-btn')) updateCartQuantity(itemId, 0);
            if (target.classList.contains('quantity-btn')) {
                const action = target.dataset.action;
                const cartItem = cart.find(item => item.id === itemId);
                if (cartItem) {
                    let newQuantity = cartItem.quantity;
                    if (action === 'increase') newQuantity++;
                    else if (action === 'decrease') newQuantity--;
                    updateCartQuantity(itemId, newQuantity);
                }
            }
        });

        document.getElementById('checkout-btn').addEventListener('click', () => {
            if (cart.length === 0) return;
            const yourWhatsappNumber = '59174420831'; 
            let orderMessage = `¡Hola Frappés Valentina! 👋 Quisiera hacer el siguiente pedido:\n\n`;
            let total = 0;
            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                orderMessage += `*${item.quantity}x* - ${item.name}\n`;
                total += itemTotal;
            });
            orderMessage += `\n*TOTAL: Bs ${total.toFixed(2)}*`;
            const encodedMessage = encodeURIComponent(orderMessage);
            const whatsappUrl = `https://wa.me/${yourWhatsappNumber}?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
            showSuccessModal('¡Pedido listo para enviar!', 'Se abrirá WhatsApp para que completes tu pedido. También puedes descargar tu comprobante.', generateOrderPDF);
        });

        renderCartPage();
    }

    function setupReservationPage() {
        const reservationForm = document.getElementById('reservation-form');
        if (!reservationForm) return;
        reservationForm.addEventListener('submit', e => {
            e.preventDefault();
            const reservationData = Object.fromEntries(new FormData(reservationForm).entries());
            const yourWhatsappNumber = '59174420831';
            let reservationMessage = `¡Hola Frappés Valentina! 👋 Quisiera hacer una reserva:\n\n*Nombre:* ${reservationData.name}\n*Fecha:* ${reservationData.date}\n*Hora:* ${reservationData.time}\n*Personas:* ${reservationData.guests}\n\n¡Por favor confirmar!`;
            const encodedMessage = encodeURIComponent(reservationMessage);
            const whatsappUrl = `https://wa.me/${yourWhatsappNumber}?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
            showSuccessModal('¡Reserva lista para enviar!', 'Se abrirá WhatsApp para que nos envíes los detalles.', () => generateReservationPDF(reservationData));
            reservationForm.reset();
        });
    }

    function setupNavigationAndLogin() {
        const navToggle = document.querySelector('.mobile-nav-toggle');
        const primaryNav = document.getElementById('primary-navigation');
        navToggle?.addEventListener('click', () => {
            const isVisible = primaryNav.getAttribute('data-visible') === 'true';
            primaryNav.setAttribute('data-visible', !isVisible);
            navToggle.setAttribute('aria-expanded', !isVisible);
        });
    }

    function setupSuccessModal() {
        const successModal = document.getElementById('success-modal');
        const closeBtn = document.getElementById('close-success-modal-btn');
        const generatePdfBtn = document.getElementById('generate-pdf-btn');
        closeBtn?.addEventListener('click', () => successModal.classList.remove('show'));
        generatePdfBtn?.addEventListener('click', () => {
            if (typeof pdfGenerator === 'function') pdfGenerator();
            successModal.classList.remove('show');
        });
    }

    function showSuccessModal(title, message, pdfGenFunc) {
        document.getElementById('success-modal-title').textContent = title;
        document.getElementById('success-modal-message').textContent = message;
        pdfGenerator = pdfGenFunc;
        document.getElementById('success-modal').classList.add('show');
    }

    function generateOrderPDF() {
        if (typeof window.jspdf === 'undefined') return showNotification("Error: Librería PDF no cargada.", "error");
        if (cart.length === 0) return showNotification("El carrito está vacío.", "error");
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Comprobante de Pedido - Frappés Valentina', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 35);
        doc.text(`Cliente: Invitado`, 20, 41);
        
        const tableColumn = ["Producto", "Cantidad", "Precio Unit.", "Subtotal"];
        const tableRows = [];
        let total = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            tableRows.push([item.name, item.quantity, `Bs ${item.price.toFixed(2)}`, `Bs ${itemTotal.toFixed(2)}`]);
            total += itemTotal;
        });
        
        doc.autoTable({ head: [tableColumn], body: tableRows, startY: 50 });
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total a Pagar: Bs ${total.toFixed(2)}`, 190, doc.lastAutoTable.finalY + 15, { align: 'right' });

        // ======================= ¡AQUÍ ESTÁ EL CAMBIO! =======================
        // En lugar de forzar la descarga, genera un Data URI y lo abre en una nueva pestaña.
        const pdfDataUri = doc.output('datauristring');
        window.open(pdfDataUri, '_blank');
        // ======================================================================
        
        updateStockAfterPurchase();
        cart = []; 
        saveCartToStorage(); 
        renderCartPage(); 
        renderMenu();
    }

    function generateReservationPDF(data) {
        if (typeof window.jspdf === 'undefined') return showNotification("Error: Librería PDF no cargada.", "error");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(22); doc.setFont('helvetica', 'bold');
        doc.text('Comprobante de Reserva - Frappés Valentina', 105, 20, { align: 'center' });
        doc.setFontSize(12); doc.setFont('helvetica', 'normal');
        doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 20, 35);
        doc.text(`Reservado por: ${data.name}`, 20, 41);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text('Detalles de la Reserva', 20, 60);
        doc.autoTable({ startY: 65, theme: 'plain', body: [['Nombre:', data.name], ['Email:', data.email], ['Fecha:', data.date], ['Hora:', data.time], ['Personas:', data.guests]] });
        doc.setFontSize(10);
        doc.text('Por favor, presenta este comprobante al llegar a la tienda.', 20, doc.lastAutoTable.finalY + 20);
        
        // También puedes aplicar la misma lógica aquí si lo deseas
        const pdfDataUri = doc.output('datauristring');
        window.open(pdfDataUri, '_blank');
        // doc.save(`reserva-frappes-valentina-${Date.now()}.pdf`); // Línea original
    }

    function showNotification(message, type = 'success') {
        const el = document.getElementById('notification');
        if (!el) return;
        el.textContent = message;
        el.style.backgroundImage = type === 'error' ? 'linear-gradient(to right, #D32F2F, #E64A19)' : 'var(--gradiente-principal)';
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3000);
    };
    
    initApp();
});
