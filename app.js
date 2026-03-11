let meuGrafico = null;

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    const target = document.getElementById('tab-' + tabId);
    if(target) target.style.display = 'block';
    document.getElementById('current-tab-title').innerText = tabId.toUpperCase();

    if(tabId === 'insumos') listarInsumos();
    if(tabId === 'mix-kits') listarProdutos();
    if(tabId === 'vendas') carregarProdutosVenda();
    if(tabId === 'ficha-tecnica') carregarDadosFicha();
    if(tabId === 'financeiro') listarFinanceiro();
}

// INSUMOS
function salvarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const fc = document.getElementById('ins-fc').value || 1.0;
    if(!nome) return alert("Preencha o nome");

    firebase.database().ref('insumos').push({ nome, fc: parseFloat(fc), custo: 0 })
    .then(() => { alert("Insumo salvo!"); listarInsumos(); });
}

function listarInsumos() {
    const div = document.getElementById('lista-insumos');
    firebase.database().ref('insumos').on('value', snap => {
        div.innerHTML = "";
        snap.forEach(c => {
            div.innerHTML += `<div class="item-lista">${c.val().nome} (FC: ${c.val().fc}) <button onclick="deletar('insumos','${c.key}')">X</button></div>`;
        });
    });
}

// PRODUTOS
function salvarProduto() {
    const nome = document.getElementById('mix-nome').value;
    const varejo = document.getElementById('mix-varejo').value;
    if(!nome) return alert("Preencha o nome");

    firebase.database().ref('produtos').push({ nome, preco_varejo: parseFloat(varejo), custo_total: 0 })
    .then(() => { alert("Produto salvo!"); listarProdutos(); });
}

function listarProdutos() {
    const div = document.getElementById('lista-produtos');
    firebase.database().ref('produtos').on('value', snap => {
        div.innerHTML = "";
        snap.forEach(c => {
            div.innerHTML += `<div class="item-lista">${c.val().nome} - R$ ${c.val().preco_varejo} <button onclick="deletar('produtos','${c.key}')">X</button></div>`;
        });
    });
}

// VENDAS
function carregarProdutosVenda() {
    const s = document.getElementById('venda-produto');
    s.innerHTML = "";
    firebase.database().ref('produtos').once('value', snap => {
        snap.forEach(c => {
            let o = document.createElement('option'); o.value = c.key; o.text = c.val().nome; s.appendChild(o);
        });
    });
}

function finalizarVenda() {
    const pId = document.getElementById('venda-produto').value;
    const valor = document.getElementById('venda-valor').value;
    firebase.database().ref('vendas').push({ pId, valor: parseFloat(valor), data: new Date().toLocaleDateString() })
    .then(() => alert("Venda realizada!"));
}

// FINANCEIRO
function salvarDespesa() {
    const desc = document.getElementById('fin-desc').value;
    const valor = document.getElementById('fin-valor').value;
    firebase.database().ref('financeiro').push({ desc, valor: parseFloat(valor), data: new Date().toLocaleDateString() })
    .then(() => listarFinanceiro());
}

function listarFinanceiro() {
    const div = document.getElementById('lista-financeiro');
    firebase.database().ref('financeiro').on('value', snap => {
        div.innerHTML = "";
        snap.forEach(c => {
            div.innerHTML += `<div class="item-lista">${c.val().desc} - R$ ${c.val().valor}</div>`;
        });
    });
}

function deletar(pasta, id) {
    if(confirm("Excluir?")) firebase.database().ref(pasta+'/'+id).remove();
}

window.onload = () => showTab('dashboard');
