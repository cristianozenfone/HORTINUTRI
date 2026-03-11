// --- NAVEGAÇÃO ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
    
    const target = document.getElementById('tab-' + tabId);
    if (target) target.style.display = 'block';

    const titles = {
        'dashboard': 'DASHBOARD', 'clientes': 'CLIENTES', 'insumos': 'INSUMOS',
        'mix-kits': 'PRODUTOS', 'ficha-tecnica': 'FICHA TÉCNICA',
        'producao-insumos': 'GESTÃO DE CUSTOS', 'vendas': 'VENDAS'
    };
    document.getElementById('current-tab-title').innerText = titles[tabId] || tabId.toUpperCase();

    if (tabId === 'ficha-tecnica') { carregarInsumosFicha(); carregarProdutosFicha(); }
    if (tabId === 'producao-insumos') { carregarPrecosInsumos(); }
    if (tabId === 'vendas') { carregarDadosVenda(); listarVendas(); }
}

// --- CLIENTES ---
function salvarCliente() {
    const nome = document.getElementById('cli-nome').value;
    const fone = document.getElementById('cli-fone').value;
    if (!nome) return;
    firebase.database().ref('clientes').push({ nome, telefone: fone }).then(() => alert("Cliente Salvo!"));
}

// --- INSUMOS E CUSTOS (COM FATOR DE CORREÇÃO) ---
function salvarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const unidade = document.getElementById('ins-unidade').value;
    // Pergunta o FC no momento do cadastro
    const fc = parseFloat(prompt("Informe o Fator de Correção (FC) - Ex: 1.20 para 20% de perda", "1.00")) || 1.00;
    
    if (!nome) return;
    firebase.database().ref('insumos').push({ 
        nome, 
        unidade, 
        custo: 0, 
        fc: fc 
    }).then(() => alert(nome + " cadastrado com FC de " + fc));
}

function carregarPrecosInsumos() {
    const lista = document.getElementById('lista-precos-insumos');
    firebase.database().ref('insumos').on('value', (snap) => {
        lista.innerHTML = "";
        snap.forEach((child) => {
            const i = child.val(); const id = child.key;
            lista.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:5px;">
                    <div style="font-size:12px;">
                        <strong>${i.nome}</strong> (${i.unidade || 'Un'})<br>
                        <small style="color:blue;">FC: ${i.fc || 1.00}</small>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <input type="number" step="0.01" id="preco-${id}" value="${i.custo || 0}" style="width:60px;">
                        <button onclick="atualizarCustoInsumo('${id}')" style="background:green; color:white; border:none; padding:5px 10px; border-radius:3px;">OK</button>
                    </div>
                </div>`;
        });
    });
}

function atualizarCustoInsumo(id) {
    const valor = parseFloat(document.getElementById('preco-' + id).value) || 0;
    firebase.database().ref('insumos/' + id).update({ custo: valor }).then(() => {
        alert("Custo Atualizado!"); recalcularTudo();
    });
}

// --- PRODUTOS E FICHA TÉCNICA (APLICANDO FC) ---
function salvarProdutoMix() {
    const nome = document.getElementById('mix-nome').value;
    const v = parseFloat(document.getElementById('mix-varejo').value) || 0;
    const a = parseFloat(document.getElementById('mix-atacado').value) || 0;
    firebase.database().ref('produtos').push({ nome, preco_varejo: v, preco_atacado: a, custo_total: 0 });
}

function carregarInsumosFicha() {
    const s = document.getElementById('ft-insumo-item'); s.innerHTML = '<option>Insumo</option>';
    firebase.database().ref('insumos').once('value', (snap) => {
        snap.forEach(c => { let o = document.createElement('option'); o.value = c.key; o.text = c.val().nome; s.appendChild(o); });
    });
}

function carregarProdutosFicha() {
    const s = document.getElementById('ft-produto'); s.innerHTML = '<option>Selecione o Kit</option>';
    firebase.database().ref('produtos').once('value', (snap) => {
        snap.forEach(c => { let o = document.createElement('option'); o.value = c.key; o.text = c.val().nome; s.appendChild(o); });
    });
}

function adicionarItemFicha() {
    const pId = document.getElementById('ft-produto').value;
    const iId = document.getElementById('ft-insumo-item').value;
    const q = parseFloat(document.getElementById('ft-qtd').value) || 0;
    if (pId === "Selecione o Kit" || iId === "Insumo" || q <= 0) return;

    firebase.database().ref('insumos/' + iId).once('value', (snap) => {
        const ins = snap.val();
        const fc = ins.fc || 1.00;
        // CÁLCULO REAL: Preço x Quantidade x Fator de Correção
        const sub = (ins.custo || 0) * q * fc; 

        firebase.database().ref('fichas_tecnicas/' + pId).push({
            insumoNome: ins.nome, 
            quantidade: q, 
            unidade: ins.unidade || "Un", 
            subtotal: sub,
            fcAplicado: fc
        }).then(() => { atualizarCustoFinal(pId); listarItensFicha(pId); });
    });
}

function listarItensFicha(pId) {
    const lista = document.getElementById('lista-itens-ficha');
    firebase.database().ref('fichas_tecnicas/' + pId).on('value', (snap) => {
        lista.innerHTML = "";
        snap.forEach(c => {
            const item = c.val();
            lista.innerHTML += `<li style="display:flex; justify-content:space-between; align-items:center; background:#eee; padding:8px; margin-bottom:5px; border-radius:4px;">
                <span>${item.insumoNome}: ${item.quantidade}${item.unidade} (FC ${item.fcAplicado || 1.00}) - R$ ${item.subtotal.toFixed(2)}</span>
                <i class="fas fa-trash" style="color:red; cursor:pointer;" onclick="removerItemFicha('${pId}','${c.key}')"></i>
            </li>`;
        });
    });
}

function removerItemFicha(pId, itemId) {
    if(confirm("Remover item?")) {
        firebase.database().ref(`fichas_tecnicas/${pId}/${itemId}`).remove().then(() => atualizarCustoFinal(pId));
    }
}

function atualizarCustoFinal(pId) {
    firebase.database().ref('fichas_tecnicas/' + pId).once('value', (snap) => {
        let t = 0; snap.forEach(c => t += c.val().subtotal);
        firebase.database().ref('produtos/' + pId).update({ custo_total: t });
    });
}

function recalcularTudo() {
    firebase.database().ref('produtos').once('value', (snap) => snap.forEach(p => atualizarCustoFinal(p.key)));
}

// --- VENDAS ---
function carregarDadosVenda() {
    const cli = document.getElementById('venda-cliente');
    const pro = document.getElementById('venda-produto');
    cli.innerHTML = '<option>Selecionar Cliente</option>';
    pro.innerHTML = '<option>Selecionar Produto</option>';
    
    firebase.database().ref('clientes').once('value', s => s.forEach(c => { let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; cli.appendChild(o); }));
    firebase.database().ref('produtos').once('value', s => s.forEach(p => { let o = document.createElement('option'); o.value=p.key; o.text=p.val().nome; pro.appendChild(o); }));
}

function preencherPrecoVenda(id) {
    firebase.database().ref('produtos/' + id).once('value', s => document.getElementById('venda-valor').value = s.val().preco_varejo || 0);
}

function finalizarVenda() {
    const pId = document.getElementById('venda-produto').value;
    const valor = parseFloat(document.getElementById('venda-valor').value) || 0;
    const cliNome = document.getElementById('venda-cliente').options[document.getElementById('venda-cliente').selectedIndex].text;

    if (pId === "Selecionar Produto") return;

    firebase.database().ref('produtos/' + pId).once('value', s => {
        const p = s.val();
        const lucro = valor - (p.custo_total || 0);
        firebase.database().ref('vendas').push({ 
            cliente: cliNome, 
            produto: p.nome, 
            valor, 
            lucro, 
            data: new Date().toLocaleDateString() 
        }).then(() => {
            alert("Venda Realizada! Lucro: R$ " + lucro.toFixed(2));
            listarVendas();
        });
    });
}

function listarVendas() {
    const lista = document.getElementById('lista-vendas-recente');
    firebase.database().ref('vendas').limitToLast(5).on('value', s => {
        lista.innerHTML = "";
        s.forEach(c => {
            const v = c.val();
            lista.innerHTML += `<li style="border-bottom:1px solid #ddd; padding:5px;">
                <strong>${v.cliente}</strong>: ${v.produto} | <span style="color:green;">R$ ${v.valor.toFixed(2)}</span>
            </li>`;
        });
    });
}

window.onload = () => showTab('dashboard');
