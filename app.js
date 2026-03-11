// --- CONTROLE DE ABAS ---
function showTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.style.display = 'none');

    const menuItems = document.querySelectorAll('.sidebar li');
    menuItems.forEach(item => item.classList.remove('active'));

    const selectedTab = document.getElementById('tab-' + tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }

    const titles = {
        'dashboard': 'DASHBOARD',
        'clientes': 'CADASTRO DE CLIENTES',
        'insumos': 'GESTÃO DE INSUMOS',
        'embalagens': 'GESTÃO DE EMBALAGENS',
        'mix-kits': 'GESTÃO DE PRODUTOS (MIX/KITS)',
        'ficha-tecnica': 'FICHA TÉCNICA',
        'producao-insumos': 'GESTÃO DE CUSTOS',
        'vendas': 'CENTRAL DE VENDAS',
        'financeiro': 'RESUMO FINANCEIRO'
    };
    document.getElementById('current-tab-title').innerText = titles[tabId] || tabId.toUpperCase();

    // Gatilhos de carregamento
    if (tabId === 'vendas') {
        carregarClientesVenda();
        carregarProdutosVenda();
    }
    if (tabId === 'ficha-tecnica') {
        carregarInsumosFicha();
        carregarProdutosFicha();
    }
    if (tabId === 'producao-insumos') {
        carregarPrecosInsumos();
    }
}

// --- CLIENTES ---
function salvarCliente() {
    const nome = document.getElementById('cli-nome').value;
    const fone = document.getElementById('cli-fone').value;
    if (nome === "" || fone === "") { alert("Preencha nome e WhatsApp!"); return; }

    firebase.database().ref('clientes').push({
        nome: nome,
        telefone: fone,
        dataCadastro: new Date().toLocaleDateString('pt-BR')
    }).then(() => {
        alert("Cliente salvo!");
        document.getElementById('cli-nome').value = "";
        document.getElementById('cli-fone').value = "";
    });
}

function carregarClientesVenda() {
    const select = document.getElementById('venda-cliente');
    if (!select) return;
    select.innerHTML = '<option>Selecionar Cliente</option>';
    firebase.database().ref('clientes').once('value', (snapshot) => {
        snapshot.forEach((child) => {
            const opt = document.createElement('option');
            opt.value = child.key;
            opt.text = child.val().nome;
            select.appendChild(opt);
        });
    });
}

// --- INSUMOS (CADASTRO INICIAL) ---
function salvarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const unidade = document.getElementById('ins-unidade').value;
    if (nome === "") { alert("Digite o nome!"); return; }

    firebase.database().ref('insumos').push({
        nome: nome,
        unidade: unidade,
        custo: 0 
    }).then(() => {
        alert(nome + " cadastrado!");
        document.getElementById('ins-nome').value = "";
    });
}

// --- GESTÃO DE PREÇOS (CUSTO DE COMPRA) ---
function carregarPrecosInsumos() {
    const lista = document.getElementById('lista-precos-insumos');
    if (!lista) return;

    firebase.database().ref('insumos').on('value', (snapshot) => {
        lista.innerHTML = "";
        snapshot.forEach((child) => {
            const ins = child.val();
            const id = child.key;
            lista.innerHTML += `
                <div class="card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; padding:10px;">
                    <div style="font-size:12px;"><strong>${ins.nome}</strong> (${ins.unidade})</div>
                    <div style="display:flex; gap:5px;">
                        <input type="number" step="0.01" id="preco-${id}" value="${ins.custo || 0}" style="width:70px; padding:5px; font-size:12px;">
                        <button onclick="atualizarCustoInsumo('${id}')" style="background:var(--primary-color); color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">OK</button>
                    </div>
                </div>
            `;
        });
    });
}

function atualizarCustoInsumo(id) {
    const novoCusto = parseFloat(document.getElementById('preco-' + id).value) || 0;
    firebase.database().ref('insumos/' + id).update({ custo: novoCusto }).then(() => {
        alert("Custo atualizado!");
        recalcularTodosOsMixes();
    });
}

function recalcularTodosOsMixes() {
    firebase.database().ref('produtos').once('value', (snapshot) => {
        snapshot.forEach((child) => { atualizarCustoTotalProduto(child.key); });
    });
}

// --- PRODUTOS (MIX / KITS) ---
function salvarProdutoMix() {
    const nome = document.getElementById('mix-nome').value;
    const categoria = document.getElementById('mix-categoria').value;
    const varejo = parseFloat(document.getElementById('mix-varejo').value) || 0;
    const atacado = parseFloat(document.getElementById('mix-atacado').value) || 0;

    if (nome === "") { alert("Digite o nome do Mix!"); return; }

    firebase.database().ref('produtos').push({
        nome: nome,
        categoria: categoria,
        preco_varejo: varejo,
        preco_atacado: atacado,
        custo_total: 0 
    }).then(() => {
        alert("Produto " + nome + " criado!");
        document.getElementById('mix-nome').value = "";
        document.getElementById('mix-categoria').value = "";
        document.getElementById('mix-varejo').value = "";
        document.getElementById('mix-atacado').value = "";
    });
}

// --- FICHA TÉCNICA ---
function carregarInsumosFicha() {
    const select = document.getElementById('ft-insumo-item');
    if (!select) return;
    select.innerHTML = '<option>Insumo</option>';
    firebase.database().ref('insumos').once('value', (snapshot) => {
        snapshot.forEach((child) => {
            const opt = document.createElement('option');
            opt.value = child.key;
            opt.text = child.val().nome + " (" + child.val().unidade + ")";
            select.appendChild(opt);
        });
    });
}

function carregarProdutosFicha() {
    const select = document.getElementById('ft-produto');
    if (!select) return;
    select.innerHTML = '<option>Selecione o Kit</option>';
    firebase.database().ref('produtos').once('value', (snapshot) => {
        snapshot.forEach((child) => {
            const opt = document.createElement('option');
            opt.value = child.key;
            opt.text = child.val().nome;
            select.appendChild(opt);
        });
    });
}

function adicionarItemFicha() {
    const produtoId = document.getElementById('ft-produto').value;
    const insumoId = document.getElementById('ft-insumo-item').value;
    const quantidade = parseFloat(document.getElementById('ft-qtd').value) || 0;

    if (produtoId === "Selecione o Kit" || insumoId === "Insumo" || quantidade <= 0) {
        alert("Preencha todos os campos!"); return;
    }

    firebase.database().ref('insumos/' + insumoId).once('value', (snapshot) => {
        const insumo = snapshot.val();
        const subtotal = (insumo.custo || 0) * quantidade;

        firebase.database().ref('fichas_tecnicas/' + produtoId).push({
            insumoNome: insumo.nome,
            insumoId: insumoId,
            quantidade: quantidade,
            unidade: insumo.unidade,
            subtotal: subtotal
        }).then(() => {
            document.getElementById('ft-qtd').value = "";
            atualizarCustoTotalProduto(produtoId);
            listarItensFicha(produtoId);
        });
    });
}

function atualizarCustoTotalProduto(produtoId) {
    firebase.database().ref('fichas_tecnicas/' + produtoId).once('value', (snapshot) => {
        let custoTotal = 0;
        snapshot.forEach((child) => { custoTotal += child.val().subtotal; });
        firebase.database().ref('produtos/' + produtoId).update({ custo_total: custoTotal });
    });
}

function listarItensFicha(produtoId) {
    const lista = document.getElementById('lista-itens-ficha');
    if (!lista || produtoId === "Selecione o Kit") return;

    firebase.database().ref('fichas_tecnicas/' + produtoId).on('value', (snapshot) => {
        lista.innerHTML = "";
        snapshot.forEach((child) => {
            const item = child.val();
            lista.innerHTML += `<li>${item.insumoNome}: ${item.quantidade}${item.unidade} - R$ ${item.subtotal.toFixed(2)}</li>`;
        });
    });
}

// --- VENDAS ---
function carregarProdutosVenda() {
    const select = document.getElementById('venda-produto');
    if (!select) return;
    select.innerHTML = '<option>Selecionar Produto</option>';
    firebase.database().ref('produtos').once('value', (snapshot) => {
        snapshot.forEach((child) => {
            const opt = document.createElement('option');
            opt.value = child.key;
            opt.text = child.val().nome;
            select.appendChild(opt);
        });
    });
}

window.onload = () => { showTab('dashboard'); };
