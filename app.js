// --- CONFIGURAÇÃO E ESTADO GLOBAL ---
let meuGrafico = null;

// --- NAVEGAÇÃO ENTRE ABAS ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
    
    const target = document.getElementById('tab-' + tabId);
    if (target) target.style.display = 'block';

    const titles = {
        'dashboard': 'DASHBOARD', 'clientes': 'CLIENTES', 'insumos': 'INSUMOS',
        'embalagens': 'EMBALAGENS', 'mix-kits': 'PRODUTOS', 'ficha-tecnica': 'FICHA TÉCNICA',
        'producao-insumos': 'GESTÃO DE CUSTOS', 'vendas': 'VENDAS',
        'relatorios': 'RELATÓRIOS', 'financeiro': 'FINANCEIRO'
    };
    document.getElementById('current-tab-title').innerText = titles[tabId] || tabId.toUpperCase();

    // Gatilhos de carregamento de dados
    if (tabId === 'dashboard') atualizarGrafico();
    if (tabId === 'mix-kits') listarProdutosSalvos();
    if (tabId === 'ficha-tecnica') { carregarInsumosFicha(); carregarProdutosFicha(); }
    if (tabId === 'producao-insumos') carregarPrecosInsumos();
    if (tabId === 'vendas') carregarDadosVenda();
    if (tabId === 'relatorios') gerarRelatorios();
    if (tabId === 'financeiro') listarDespesas();
}

// --- GESTÃO DE INSUMOS ---
function salvarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const unidade = document.getElementById('ins-unidade').value;
    if (!nome) return;
    
    firebase.database().ref('insumos').push({
        nome: nome,
        unidade: unidade,
        custo: 0,
        fc: 1.0
    }).then(() => {
        alert("Insumo cadastrado com ID único!");
        document.getElementById('ins-nome').value = "";
    });
}

function carregarPrecosInsumos() {
    const lista = document.getElementById('lista-precos-insumos');
    firebase.database().ref('insumos').on('value', (snap) => {
        lista.innerHTML = "";
        snap.forEach((child) => {
            const i = child.val(); const id = child.key;
            lista.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:5px;">
                    <div style="font-size:12px;"><strong>${i.nome}</strong><br><small>FC: ${i.fc || 1.00}</small></div>
                    <div style="display:flex; gap:5px;">
                        <input type="number" step="0.01" id="preco-${id}" value="${i.custo || 0}" style="width:70px;">
                        <button onclick="atualizarCustoInsumo('${id}')" style="background:green; color:white; border:none; padding:8px; border-radius:3px;">OK</button>
                    </div>
                </div>`;
        });
    });
}

function atualizarCustoInsumo(id) {
    const valor = parseFloat(document.getElementById('preco-' + id).value) || 0;
    firebase.database().ref('insumos/' + id).update({ custo: valor }).then(() => recalcularTudo());
}

// --- GESTÃO DE PRODUTOS (MIX / KITS) ---
function salvarProdutoMix() {
    const nome = document.getElementById('mix-nome').value;
    const varejo = parseFloat(document.getElementById('mix-varejo').value) || 0;
    if (!nome) return;

    firebase.database().ref('produtos').push({
        nome: nome,
        preco_varejo: varejo,
        custo_total: 0
    }).then(() => {
        alert("Produto salvo no banco!");
        document.getElementById('mix-nome').value = "";
        document.getElementById('mix-varejo').value = "";
    });
}

function listarProdutosSalvos() {
    const lista = document.getElementById('lista-produtos-salvos');
    firebase.database().ref('produtos').on('value', (snap) => {
        lista.innerHTML = "";
        snap.forEach(child => {
            const p = child.val();
            lista.innerHTML += `
                <div class="card" style="padding:10px; margin-bottom:5px; border-left:5px solid #2e7d32; display:flex; justify-content:space-between;">
                    <div><strong>${p.nome}</strong><br><small>Venda: R$ ${p.preco_varejo.toFixed(2)}</small></div>
                    <div style="text-align:right;"><small>Custo Prod.</small><br><strong>R$ ${(p.custo_total || 0).toFixed(2)}</strong></div>
                </div>`;
        });
    });
}

// --- FICHA TÉCNICA ---
function carregarInsumosFicha() {
    const s = document.getElementById('ft-insumo-item'); s.innerHTML = '<option>Insumo</option>';
    firebase.database().ref('insumos').once('value', s1 => s1.forEach(c => {
        let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; s.appendChild(o);
    }));
}

function carregarProdutosFicha() {
    const s = document.getElementById('ft-produto'); s.innerHTML = '<option>Selecione o Kit</option>';
    firebase.database().ref('produtos').once('value', s1 => s1.forEach(c => {
        let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; s.appendChild(o);
    }));
}

function adicionarItemFicha() {
    const pId = document.getElementById('ft-produto').value;
    const iId = document.getElementById('ft-insumo-item').value;
    const q = parseFloat(document.getElementById('ft-qtd').value) || 0;
    if (pId === "Selecione o Kit" || iId === "Insumo" || q <= 0) return;

    firebase.database().ref('insumos/' + iId).once('value', (snap) => {
        const ins = snap.val();
        const sub = (ins.custo || 0) * q * (ins.fc || 1.00);
        firebase.database().ref('fichas_tecnicas/' + pId).push({
            insumo_id: iId, nome: ins.nome, qtd: q, subtotal: sub
        }).then(() => {
            recalcularCustoProduto(pId);
            listarItensFicha(pId);
        });
    });
}

function listarItensFicha(pId) {
    const lista = document.getElementById('lista-itens-ficha');
    firebase.database().ref('fichas_tecnicas/' + pId).on('value', (snap) => {
        lista.innerHTML = "";
        snap.forEach(c => {
            lista.innerHTML += `<li>${c.val().nome}: ${c.val().qtd} - R$ ${c.val().subtotal.toFixed(2)}</li>`;
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

function recalcularTudo() {
    firebase.database().ref('produtos').once('value', snap => {
        snap.forEach(p => recalcularCustoProduto(p.key));
    });
}

// --- VENDAS PROFISSIONAIS (MULTI-ITENS) ---
function carregarDadosVenda() {
    const cli = document.getElementById('venda-cliente');
    const pro = document.getElementById('venda-produto');
    cli.innerHTML = '<option>Selecionar Cliente</option>';
    pro.innerHTML = '<option>Selecionar Produto</option>';
    firebase.database().ref('clientes').once('value', s => s.forEach(c => {
        let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; cli.appendChild(o);
    }));
    firebase.database().ref('produtos').once('value', s => s.forEach(p => {
        let o = document.createElement('option'); o.value=p.key; o.text=p.val().nome; pro.appendChild(o);
    }));
}

function finalizarVenda() {
    const pId = document.getElementById('venda-produto').value;
    const valor = parseFloat(document.getElementById('venda-valor').value) || 0;
    const cliNome = document.getElementById('venda-cliente').options[document.getElementById('venda-cliente').selectedIndex].text;
    
    if (pId === "Selecionar Produto" || valor <= 0) return;

    const novaVendaRef = firebase.database().ref('vendas').push();
    const vendaId = novaVendaRef.key;

    firebase.database().ref('produtos/' + pId).once('value', s => {
        const p = s.val();
        const lucro = valor - (p.custo_total || 0);
        
        const dadosVenda = {
            venda_id: vendaId,
            cliente: cliNome,
            total: valor,
            lucro_total: lucro,
            data: new Date().toLocaleDateString(),
            timestamp: Date.now()
        };

        // Salvando no nó itens_venda (Auditoria ponto 2)
        firebase.database().ref('itens_venda/' + vendaId).push({
            produto_id: pId, nome: p.nome, preco: valor
        });

        novaVendaRef.set(dadosVenda).then(() => {
            alert("Venda registrada com sucesso!");
            atualizarGrafico();
        });
    });
}

// --- DASHBOARD E RELATÓRIOS ---
function atualizarGrafico() {
    firebase.database().ref('vendas').limitToLast(10).once('value', snap => {
        const labels = []; const valores = [];
        snap.forEach(c => { labels.push(c.val().data); valores.push(c.val().total); });
        const ctx = document.getElementById('graficoVendas').getContext('2d');
        if (meuGrafico) meuGrafico.destroy();
        meuGrafico = new Chart(
