// --- ESTADO E NAVEGAÇÃO ---
let meuGrafico = null;

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
    
    const target = document.getElementById('tab-' + tabId);
    if (target) {
        target.style.display = 'block';
        document.getElementById('current-tab-title').innerText = tabId.toUpperCase().replace('-', ' ');
    }

    // Gatilhos de Carregamento
    if (tabId === 'dashboard') atualizarGrafico();
    if (tabId === 'insumos') listarInsumos();
    if (tabId === 'mix-kits') listarProdutos();
    if (tabId === 'ficha-tecnica') { carregarInsumosFicha(); carregarProdutosFicha(); }
    if (tabId === 'producao-insumos') carregarPrecosInsumos();
    if (tabId === 'vendas') carregarDadosVenda();
    if (tabId === 'relatorios') gerarRelatorios();
    if (tabId === 'financeiro') listarDespesas();
}

// --- GESTÃO DE INSUMOS (COM FC) ---
function salvarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const unidade = document.getElementById('ins-unidade').value;
    const fc = parseFloat(document.getElementById('ins-fc').value) || 1.0;
    if (!nome) return alert("Nome é obrigatório");

    firebase.database().ref('insumos').push({
        nome: nome, unidade: unidade, fc: fc, custo: 0
    }).then(() => {
        alert("Insumo Salvo!");
        document.getElementById('ins-nome').value = "";
        listarInsumos();
    });
}

function listarInsumos() {
    const lista = document.getElementById('lista-insumos-cadastrados');
    firebase.database().ref('insumos').on('value', snap => {
        lista.innerHTML = "";
        snap.forEach(c => {
            lista.innerHTML += `
            <div class="item-lista">
                <span>${c.val().nome} (${c.val().unidade}) - FC: ${c.val().fc}</span>
                <button class="btn-del" onclick="deletar('insumos','${c.key}')">X</button>
            </div>`;
        });
    });
}

// --- GESTÃO DE PRODUTOS (MIX / KITS) ---
function salvarProduto() {
    const nome = document.getElementById('mix-nome').value;
    const varejo = parseFloat(document.getElementById('mix-varejo').value) || 0;
    const atacado = parseFloat(document.getElementById('mix-atacado').value) || 0;
    if (!nome) return alert("Nome do Mix é obrigatório");

    firebase.database().ref('produtos').push({
        nome: nome, preco_varejo: varejo, preco_atacado: atacado, custo_total: 0
    }).then(() => {
        alert("Produto Salvo!");
        document.getElementById('mix-nome').value = "";
        listarProdutos();
    });
}

function listarProdutos() {
    const lista = document.getElementById('lista-produtos-cadastrados');
    firebase.database().ref('produtos').on('value', snap => {
        lista.innerHTML = "";
        snap.forEach(c => {
            lista.innerHTML += `
            <div class="item-lista">
                <span>${c.val().nome} - R$ ${c.val().preco_varejo.toFixed(2)}</span>
                <button class="btn-del" onclick="deletar('produtos','${c.key}')">X</button>
            </div>`;
        });
    });
}

// --- FICHA TÉCNICA (CÁLCULO DE CUSTO REAL) ---
function carregarInsumosFicha() {
    const s = document.getElementById('ft-insumo-item');
    s.innerHTML = '<option value="">Selecione Insumo</option>';
    firebase.database().ref('insumos').once('value', snap => snap.forEach(c => {
        let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; s.appendChild(o);
    }));
}

function carregarProdutosFicha() {
    const s = document.getElementById('ft-produto');
    s.innerHTML = '<option value="">Selecione o Kit</option>';
    firebase.database().ref('produtos').once('value', snap => snap.forEach(c => {
        let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; s.appendChild(o);
    }));
}

function adicionarItemFicha() {
    const pId = document.getElementById('ft-produto').value;
    const iId = document.getElementById('ft-insumo-item').value;
    const q = parseFloat(document.getElementById('ft-qtd').value) || 0;
    if (!pId || !iId || q <= 0) return alert("Preencha todos os campos da ficha");

    firebase.database().ref('insumos/' + iId).once('value', snap => {
        const ins = snap.val();
        const subtotal = (ins.custo || 0) * q * (ins.fc || 1.0);
        
        firebase.database().ref('fichas_tecnicas/' + pId).push({
            insumo_id: iId, nome: ins.nome, qtd: q, subtotal: subtotal
        }).then(() => {
            recalcularCustoProduto(pId);
            listarItensFicha(pId);
        });
    });
}

function listarItensFicha(pId) {
    const lista = document.getElementById('lista-itens-ficha');
    firebase.database().ref('fichas_tecnicas/' + pId).on('value', snap => {
        lista.innerHTML = "";
        snap.forEach(c => {
            lista.innerHTML += `<li>${c.val().nome} - ${c.val().qtd} - R$ ${c.val().subtotal.toFixed(2)}</li>`;
        });
    });
}

function recalcularCustoProduto(pId) {
    firebase.database().ref('fichas_tecnicas/' + pId).once('value', snap => {
        let total = 0;
        snap.forEach(c => { total += c.val().subtotal; });
        firebase.database().ref('produtos/' + pId).update({ custo_total: total });
    });
}

// --- GESTÃO DE CUSTOS (ATUALIZAÇÃO DE PREÇOS) ---
function carregarPrecosInsumos() {
    const lista = document.getElementById('lista-precos-insumos');
    firebase.database().ref('insumos').on('value', snap => {
        lista.innerHTML = "";
        snap.forEach(c => {
            const id = c.key; const i = c.val();
            lista.innerHTML += `
            <div class="card-custo">
                <span>${i.nome}</span>
                <input type="number" step="0.01" id="p-${id}" value="${i.custo}">
                <button onclick="salvarPrecoInsumo('${id}')">OK</button>
            </div>`;
        });
    });
}

function salvarPrecoInsumo(id) {
    const novoPreco = parseFloat(document.getElementById('p-' + id).value) || 0;
    firebase.database().ref('insumos/' + id).update({ custo: novoPreco }).then(() => {
        alert("Preço atualizado!");
        recalcularTudo();
    });
}

function recalcularTudo() {
    firebase.database().ref('produtos').once('value', snap => {
        snap.forEach(p => recalcularCustoProduto(p.key));
    });
}

// --- VENDAS ---
function carregarDadosVenda() {
    const s = document.getElementById('venda-produto');
    s.innerHTML = '<option value="">Selecionar Mix</option>';
    firebase.database().ref('produtos').once('value', snap => snap.forEach(c => {
        let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; s.appendChild(o);
    }));
}

function finalizarVenda() {
    const pId = document.getElementById('venda-produto').value;
    const valor = parseFloat(document.getElementById('venda-valor').value) || 0;
    if (!pId || valor <= 0) return alert("Dados de venda inválidos");

    firebase.database().ref('produtos/' + pId).once('value', snap => {
        const p = snap.val();
        const lucro = valor - (p.custo_total || 0);

        const vendaRef = firebase.database().ref('vendas').push();
        vendaRef.set({
            produto: p.nome,
            valor: valor,
            lucro: lucro,
            data: new Date().toLocaleDateString(),
            timestamp: Date.now()
        }).then(() => {
            alert("Venda Confirmada!");
            showTab('dashboard');
        });
    });
}

// --- FINANCEIRO ---
function salvarDespesa() {
    const desc = document.getElementById('fin-desc').value;
    const valor = parseFloat(document.getElementById('fin-valor').value) || 0;
    if(!desc || valor <= 0) return;
    firebase.database().ref('financeiro').push({
        descricao: desc, valor: valor, data: new Date().toLocaleDateString()
    }).then(() => {
        document.getElementById('fin-desc').value = "";
        document.getElementById('fin-valor').value = "";
    });
}

function listarDespesas() {
    const lista = document.getElementById('lista-financeiro');
    firebase.database().ref('financeiro').on('value', snap => {
        lista.innerHTML = "";
        snap.forEach(c => {
            lista.innerHTML += `<div class="item-lista"><span>${c.val().descricao}</span> <strong>R$ ${c.val().valor.toFixed(2)}</strong></div>`;
        });
    });
}

// --- DASHBOARD E GRÁFICOS ---
function atualizarGrafico() {
    const ctx = document.getElementById('graficoVendas').getContext('2d');
    firebase.database().ref('vendas').limitToLast(7).once('value', snap => {
        let labels = []; let valores = [];
        snap.forEach(v => { labels.push(v.val().data); valores.push(v.val().valor); });
        if (meuGrafico) meuGrafico.destroy();
        meuGrafico = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: [{ label: 'Vendas R$', data: valores, borderColor: '#2e7d32', fill: true }] }
        });
    });
}

function gerarRelatorios() {
    firebase.database().ref('vendas').on('value', snap => {
        let tV = 0; let tL = 0;
        snap.forEach(v => { tV += v.val().valor; tL += v.val().lucro; });
        document.getElementById('total-vendas-rep').innerText = "R$ " + tV.toFixed(2);
        document.getElementById('total-lucro-rep').innerText = "R$ " + tL.toFixed(2);
    });
}

function deletar(pasta, id) {
    if (confirm("Excluir registro?")) firebase.database().ref(pasta + '/' + id).remove();
}

window.onload = () => showTab('dashboard');
