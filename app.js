// ========= CONFIG =========
const WHATSAPP_NUMBER = "5588996416664";  // Guará Burger
const DELIVERY_FEE = 0.00;               // ✅ ENTREGA GRÁTIS

// Horário: Seg a Sáb 17:00–22:00 (Brasil -03:00)
const OPEN_DAYS = [1,2,3,4,5,6]; // 0=Dom, 1=Seg ... 6=Sáb
const OPEN_HOUR = 17;            // 17:00
const CLOSE_HOUR = 22;           // 22:00

// ========= STORAGE =========
const LS_CART = "guara_cart_app_v1";
const LS_ORDERS = "guara_orders_v1";       // admin lê daqui

// ========= MENU =========
const MENU = [
  {
    id: "lanches",
    title: "Lanches",
    items: [
      { id:"hamburguer", name:"Hambúrguer", desc:"Pão, carne, ovo, tomate, cebola, alface e queijo.", price:10.00 },
      { id:"xsalada", name:"X-Salada", desc:"Pão, carne, ovo, muçarela, alface, tomate e cebola.", price:12.00 },
      { id:"xburguer", name:"X-Burguer", desc:"Pão, carne, ovo, muçarela, presunto, alface, tomate e cebola.", price:13.00 },
      { id:"xcalabresa", name:"X-Calabresa", desc:"Pão, carne, ovo, muçarela, calabresa, alface, tomate e cebola.", price:13.00 },
      { id:"xbacon", name:"X-Bacon", desc:"Pão, carne, ovo, muçarela, presunto, bacon, alface, tomate e cebola.", price:14.00 },
      { id:"xtudo", name:"X-Tudo", desc:"Pão, carne, ovo, muçarela, presunto, calabresa, bacon, alface, tomate e cebola.", price:16.00 },
      { id:"hotdog", name:"Hot-Dog", desc:"Pão, salsicha, carne, molho, milho, ervilha, batata palha, catchup e maionese.", price:6.00 },
      { id:"misto", name:"Misto Quente", desc:"Pão de forma, mussarela e presunto.", price:4.00 },
      { id:"cafe", name:"Cafézinho", desc:"Tradicional.", price:2.00 },
    ]
  },
  {
    id: "bebidas",
    title: "Bebidas",
    items: [
      { id:"coca-lata", name:"Coca Lata", desc:"Lata", price:5.00 },
      { id:"cajuina-lata", name:"Cajuína Lata", desc:"Lata", price:5.00 },
      { id:"guarana-lata", name:"Guaraná Lata", desc:"Lata", price:5.00 },
      { id:"wolga-250", name:"Wolga 250ml", desc:"Garrafinha", price:2.50 },
      { id:"coca-250", name:"Coca 250ml", desc:"Garrafinha", price:4.00 },
      { id:"pepsi-1l", name:"Pepsi 1 Litro", desc:"Garrafa 1L", price:7.00 },
      { id:"agua", name:"Água Mineral", desc:"Garrafinha", price:2.50 },
    ]
  }
];

// ========= HELPERS =========
function money(n){
  return n.toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:2});
}
function getCart(){
  return JSON.parse(localStorage.getItem(LS_CART) || "[]");
}
function setCart(cart){
  localStorage.setItem(LS_CART, JSON.stringify(cart));
}
function findInCart(id){
  return getCart().find(x => x.id === id);
}
function cartCount(){
  return getCart().reduce((acc,it)=>acc+(it.qty||0),0);
}
function cartSubtotal(){
  return getCart().reduce((acc,it)=>acc+(it.qty*it.price),0);
}
function cartTotal(){
  const subtotal = cartSubtotal();
  return (subtotal > 0) ? (subtotal + DELIVERY_FEE) : 0;
}

function upsertItem({id,name,price,qty}){
  const cart = getCart();
  const idx = cart.findIndex(x=>x.id===id);
  if(idx >= 0){
    cart[idx].qty = qty;
    if(cart[idx].qty <= 0) cart.splice(idx,1);
  } else {
    if(qty > 0) cart.push({id,name,price,qty});
  }
  setCart(cart);
  refreshUI();
}

// ========= OPEN/CLOSED =========
function getNowBrazil(){
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t)=> parts.find(p=>p.type===t)?.value;
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));
  const hh = Number(get("hour"));
  const mm = Number(get("minute"));
  const ss = Number(get("second"));
  return new Date(y, m-1, d, hh, mm, ss);
}

function isOpenNow(){
  const now = getNowBrazil();
  const day = now.getDay();
  const hour = now.getHours();
  const min = now.getMinutes();

  if(!OPEN_DAYS.includes(day)) return { open:false, label:"Fechados (Domingo)" };

  const afterOpen = (hour > OPEN_HOUR) || (hour === OPEN_HOUR && min >= 0);
  const beforeClose = (hour < CLOSE_HOUR) || (hour === CLOSE_HOUR && min === 0);

  const open = afterOpen && beforeClose;
  if(open) return { open:true, label:"Estamos abertos" };

  return { open:false, label:`Fechados (Seg-Sáb 17h às 22h)` };
}

// ========= RENDER MENU =========
function renderMenu(){
  const root = document.querySelector("#menuRoot");
  if(!root) return;

  root.innerHTML = MENU.map(cat => `
    <div class="section" id="sec-${cat.id}">
      <div class="sectionHead">
        <h2>${cat.title}</h2>
        <small>${cat.items.length} itens</small>
      </div>
      <div class="sectionBody">
        <div class="items">
          ${cat.items.map(item => {
            const found = findInCart(item.id);
            const qty = found ? found.qty : 0;
            return `
              <div class="item" data-item data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">
                <div class="left">
                  <div class="name">${item.name}</div>
                  <div class="desc">${item.desc}</div>
                  <div class="price">R$ ${money(item.price)}</div>
                </div>
                <div class="qty">
                  <button type="button" data-minus aria-label="Remover">−</button>
                  <span data-qty>${qty}</span>
                  <button type="button" data-plus aria-label="Adicionar">+</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  `).join("");

  root.querySelectorAll("[data-item]").forEach(card => {
    const id = card.getAttribute("data-id");
    const name = card.getAttribute("data-name");
    const price = Number(card.getAttribute("data-price"));
    const minus = card.querySelector("[data-minus]");
    const plus = card.querySelector("[data-plus]");
    const qtyEl = card.querySelector("[data-qty]");

    const found = findInCart(id);
    let qty = found ? found.qty : 0;

    const sync = () => {
      qtyEl.textContent = String(qty);
      upsertItem({id,name,price,qty});
    };

    minus.addEventListener("click", ()=>{
      qty = Math.max(0, qty-1);
      sync();
    });
    plus.addEventListener("click", ()=>{
      qty = qty+1;
      sync();
    });
  });
}

// ========= CART DRAWER =========
function openDrawer(){
  document.querySelector("#drawerBackdrop").style.display = "block";
  document.querySelector("#drawer").classList.add("open");
}
function closeDrawer(){
  document.querySelector("#drawerBackdrop").style.display = "none";
  document.querySelector("#drawer").classList.remove("open");
}

function renderCartDrawer(){
  const linesWrap = document.querySelector("#cartLines");
  const subtotalEl = document.querySelector("#subtotal");
  const deliveryEl = document.querySelector("#delivery");
  const totalEl = document.querySelector("#total");

  const cart = getCart();
  const subtotal = cartSubtotal();
  const total = cartTotal();

  if(cart.length === 0){
    linesWrap.innerHTML = `<div class="smallNote">Seu carrinho está vazio.</div>`;
  } else {
    linesWrap.innerHTML = cart.map(it => `
      <div class="cartLine">
        <div><b>${it.qty}x</b> ${it.name}</div>
        <div class="muted">R$ ${money(it.qty*it.price)}</div>
      </div>
    `).join("");
  }

  subtotalEl.textContent = `R$ ${money(subtotal)}`;
  deliveryEl.textContent = `R$ ${money(subtotal > 0 ? DELIVERY_FEE : 0)}`; // sempre 0,00
  totalEl.textContent = `R$ ${money(total)}`;
}

// ========= FINALIZAR =========
function buildMessage({nome,endereco,ref}){
  const cart = getCart();
  const subtotal = cartSubtotal();
  const total = cartTotal();
  const delivery = subtotal > 0 ? DELIVERY_FEE : 0;

  const lines = cart.map(it => `${it.qty}x ${it.name} — R$ ${money(it.qty*it.price)}`).join("\n");

  return (
`🧾 *PEDIDO - GUARÁ BURGUER*
👤 Cliente: ${nome}
📍 Endereço: ${endereco}
🧭 Ref.: ${ref || "-"}

🍔 Itens:
${lines}

💰 Subtotal: R$ ${money(subtotal)}
🚚 Entrega: R$ ${money(delivery)} (GRÁTIS)
✅ Total: R$ ${money(total)}`
  );
}

function saveOrderToAdmin({nome,endereco,ref}){
  const cart = getCart();
  const subtotal = cartSubtotal();
  const total = cartTotal();
  const delivery = subtotal > 0 ? DELIVERY_FEE : 0;

  const now = new Date().toISOString();
  const day = now.slice(0,10);

  const order = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: now,
    day,
    customer: { nome, endereco, referencia: ref || "" },
    items: cart,
    subtotal,
    delivery,
    total,
    status: "enviado"
  };

  const orders = JSON.parse(localStorage.getItem(LS_ORDERS) || "[]");
  orders.push(order);
  localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
}

function finalizarCompra(){
  const {open, label} = isOpenNow();
  if(!open){
    alert(`No momento estamos fechados.\n${label}`);
    return;
  }

  const cart = getCart();
  if(cart.length === 0){
    alert("Seu carrinho está vazio.");
    return;
  }

  const nome = document.querySelector("#nome").value.trim();
  const endereco = document.querySelector("#endereco").value.trim();
  const ref = document.querySelector("#referencia").value.trim();

  if(!nome || !endereco){
    alert("Preencha Nome e Endereço para finalizar.");
    return;
  }

  saveOrderToAdmin({nome,endereco,ref});

  const msg = buildMessage({nome,endereco,ref});
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

// ========= UI REFRESH =========
function refreshStatus(){
  const pill = document.querySelector("#statusPill");
  const text = document.querySelector("#statusText");
  const {open, label} = isOpenNow();

  pill.classList.toggle("open", open);
  pill.classList.toggle("closed", !open);
  text.textContent = open ? "Estamos abertos" : "Estamos fechados";

  const finalizeBtn = document.querySelector("#btnFinalizar");
  finalizeBtn.disabled = !open || cartCount() === 0;

  const hint = document.querySelector("#statusHint");
  hint.textContent = open ? "Seg a Sáb • 17h às 22h • Entrega grátis" : label;
}

function refreshBottomBar(){
  const count = cartCount();
  const total = cartTotal();

  document.querySelector("#bottomCount").textContent = String(count);
  document.querySelector("#bottomLine1").textContent =
    count > 0 ? `${count} item(ns) no carrinho` : `Carrinho vazio`;
  document.querySelector("#bottomLine2").textContent =
    count > 0 ? `Total: R$ ${money(total)} • Entrega grátis`
              : `Adicione itens para continuar`;

  const btnCart = document.querySelector("#btnCarrinho");
  btnCart.disabled = (count === 0);

  const btnFinal = document.querySelector("#btnFinalizar");
  btnFinal.disabled = !(isOpenNow().open) || (count === 0);

  document.querySelector("#cartBadge").textContent = String(count);
}

function refreshUI(){
  document.querySelectorAll("[data-item]").forEach(card=>{
    const id = card.getAttribute("data-id");
    const qtyEl = card.querySelector("[data-qty]");
    const found = findInCart(id);
    qtyEl.textContent = String(found ? found.qty : 0);
  });

  renderCartDrawer();
  refreshBottomBar();
  refreshStatus();
}

// ========= INIT =========
document.addEventListener("DOMContentLoaded", ()=>{
  renderMenu();
  refreshUI();

  document.querySelector("#btnCarrinho").addEventListener("click", openDrawer);
  document.querySelector("#drawerBackdrop").addEventListener("click", closeDrawer);
  document.querySelector("#btnCloseDrawer").addEventListener("click", closeDrawer);

  document.querySelector("#btnFinalizar").addEventListener("click", finalizarCompra);

  document.querySelector("#btnLimpar").addEventListener("click", ()=>{
    if(confirm("Limpar carrinho?")){
      localStorage.removeItem(LS_CART);
      refreshUI();
      closeDrawer();
    }
  });

  setInterval(refreshStatus, 20000);
});