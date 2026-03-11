// --- ESTADO GLOBAL E NAVEGAÇÃO ---
let meuGrafico = null;

function showTab(tabId) {
    // Esconde todas as abas
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    
    // Mostra a aba clicada
    const target = document.getElementById('tab-' + tabId);
    if (target) target.style.display = 'block';

    // Atualiza o título no topo
    const titles = {
        'dashboard': 'DASHBOARD', 'clientes': 'CLIENTES', 'insumos': 'INSUMOS',
        'embalagens': 'EMBALAGENS', 'mix-kits': 'MIX / KITS', 'ficha-tecnica': 'FICHA TÉCNICA',
        'producao-insumos': 'GESTÃO DE CUSTOS', 'vendas': 'VENDAS',
        'relatorios': 'RELATÓRIOS', 'financeiro': 'FINANCEIRO'
    };
    document.getElementById('current-tab-title').innerText = titles[tabId] || tabId.toUpperCase();

    // Gatilhos de carregamento
    if (tabId === 'dashboard') atualizarGrafico();
    if (tabId === 'insumos') listarInsumos();
    if (tabId === 'mix-kits') listarProdutos();
    if (tabId === 'ficha-tecnica') { carregarInsumosFicha(); carregarProdutosFicha(); }
    if (tabId === 'producao-insumos') listarCustosInsumos();
    if (tabId === 'vendas') carregarDadosVenda();
    if (tabId === 'relatorios') gerarRelatorios();
}

// --- GESTÃO DE INSUMOS ---
function salvarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const unidade = document.getElementById('ins-unidade').value;
    if (!nome) return alert("Informe o nome do insumo");
    
    firebase.database().ref('insumos').push({
        nome: nome, unidade: unidade, custo: 0, fc: 1.0
    }).then(() => {
        alert("Insumo cadastrado!");
        document.getElementById('ins-nome').value = "";
        listarInsumos();
    });
}

function listarInsumos() {
    const lista = document.getElementById('lista-insumos-cadastrados');
    if(!lista) return;
    firebase.database().ref('insumos').on('value', snap => {
        lista.innerHTML = "";
        snap.forEach(c => {
            lista.innerHTML += `<div class="item-lista">${c.val().nome} (${c.val().unidade}) <button onclick="deletar('insumos','${c.key}')">Excluir</button></div>`;
        });
    });
}

// --- GESTÃO DE PRODUTOS (MIX / KITS) ---
function salvarProduto() {
    const nome = document.getElementById('mix-nome').value;
    const varejo = parseFloat(document.getElementById('mix-varejo').value) || 0;
    const atacado = parseFloat(document.getElementById('mix-atacado').value) || 0;
    if (!nome) return alert("Informe o nome do produto");

    firebase.database().ref('produtos').push({
        nome: nome, preco_varejo: varejo, preco_atacado: atacado, custo_total: 0
    }).then(() => {
        alert("Produto salvo!");
        document.getElementById('mix-nome').value = "";
        document.getElementById('mix-varejo').value = "";
        document.getElementById('mix-atacado').value = "";
        listarProdutos();
    });
}

function listarProdutos() {
    const lista = document.getElementById('lista-produtos-cadastrados');
    if(!lista) return;
    firebase.database().ref('produtos').on('value', snap => {
        lista.innerHTML = "";
        snap.forEach(c => {
            lista.innerHTML += `<div class="item-lista">${c.val().nome} - R$ ${c.val().preco_varejo.toFixed(2)} <button onclick="deletar('produtos','${c.key}')">Excluir</button></div>`;
        });
    });
}

// --- FICHA TÉCNICA E CUSTOS ---
function carregarInsumosFicha() {
    const s = document.getElementById('ft-insumo-item');
    if(!s) return;
    s.innerHTML = '<option value="">Insumo</option>';
    firebase.database().ref('insumos').once('value', snap => snap.forEach(c => {
        let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; s.appendChild(o);
    }));
}

function carregarProdutosFicha() {
    const s = document.getElementById('ft-produto');
    if(!s) return;
    s.innerHTML = '<option value="">Selecione o Kit</option>';
    firebase.database().ref('produtos').once('value', snap => snap.forEach(c => {
        let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; s.appendChild(o);
    }));
}

// --- VENDAS ---
function carregarDadosVenda() {
    const sel = document.getElementById('venda-produto');
    if(!sel) return;
    sel.innerHTML = '<option value="">Selecionar Produto</option>';
    firebase.database().ref('produtos').once('value', snap => snap.forEach(c => {
        let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; sel.appendChild(o);
    }));
}

function finalizarVenda() {
    const pId = document.getElementById('venda-produto').value;
    const valor = parseFloat(document.getElementById('venda-valor').value) || 0;
    if (!pId || valor <= 0) return alert("Verifique produto e valor");

    firebase.database().ref('vendas').push({
        produtoId: pId,
        valor: valor,
        data: new Date().toLocaleDateString(),
        timestamp: Date.now()
    }).then(() => {
        alert("Venda registrada!");
        document.getElementById('venda-valor').value = "";
        showTab('dashboard');
    });
}

// --- AUXILIARES ---
function deletar(pasta, id) {
    if(confirm("Deseja excluir?")) firebase.database().ref(pasta + '/' + id).remove();
}

window.onload = () => showTab('dashboard');
