const LS_ORDERS = "guara_orders_v1";

function money(n){
  return n.toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:2});
}
function todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function getOrders(){
  return JSON.parse(localStorage.getItem(LS_ORDERS) || "[]");
}
function setOrders(list){
  localStorage.setItem(LS_ORDERS, JSON.stringify(list));
}

function render(){
  const day = todayKey();
  document.querySelector("#dayLabel").textContent = day;

  const all = getOrders();
  const orders = all.filter(o => o.day === day)
    .sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));

  document.querySelector("#ordersCount").textContent = String(orders.length);
  const total = orders.reduce((acc,o)=> acc + (Number(o.total)||0), 0);
  document.querySelector("#ordersTotal").textContent = `R$ ${money(total)}`;

  const list = document.querySelector("#ordersList");
  list.innerHTML = "";

  if(orders.length === 0){
    list.innerHTML = `<div class="smallNote">Nenhum pedido hoje.</div>`;
    return;
  }

  for(const o of orders){
    const hora = o.createdAt ? new Date(o.createdAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--:--";
    const nome = o.customer?.nome || "-";
    const end = o.customer?.endereco || "-";
    const ref = o.customer?.referencia || "-";
    const itens = (o.items||[]).map(i => `${i.qty}x ${i.name}`).join(" • ");

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="left">
        <div class="name">${hora} — ${nome}</div>
        <div class="desc">${itens}</div>
        <div class="desc">📍 ${end}</div>
        <div class="desc">🧭 ${ref}</div>
      </div>
      <div style="text-align:right;">
        <div class="price">R$ ${money(Number(o.total)||0)}</div>
        <div class="desc">${o.status || "—"}</div>
      </div>
    `;
    list.appendChild(el);
  }
}

function exportCSV(){
  const day = todayKey();
  const orders = getOrders().filter(o => o.day === day);

  const header = ["id","createdAt","cliente","endereco","referencia","itens","subtotal","entrega","total"].join(",");
  const rows = orders.map(o => {
    const itens = (o.items||[]).map(i => `${i.qty}x ${i.name}`).join(" | ");
    const c = o.customer || {};
    const safe = (s) => `"${String(s||"").replaceAll('"','""')}"`;
    return [
      safe(o.id),
      safe(o.createdAt),
      safe(c.nome),
      safe(c.endereco),
      safe(c.referencia),
      safe(itens),
      Number(o.subtotal||0),
      Number(o.delivery||0),
      Number(o.total||0)
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `pedidos_${day}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", ()=>{
  render();

  document.querySelector("#btnExport").addEventListener("click", exportCSV);

  document.querySelector("#btnClearDay").addEventListener("click", ()=>{
    if(!confirm("Tem certeza que deseja apagar os pedidos de HOJE?")) return;
    const day = todayKey();
    const all = getOrders();
    const keep = all.filter(o => o.day !== day);
    setOrders(keep);
    render();
  });
});