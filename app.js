// --- CONTROLE DE NAVEGAÇÃO ---
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
        'relatorios': 'RELATÓRIOS E DESEMPENHO',
        'financeiro': 'RESUMO FINANCEIRO'
    };
    document.getElementById('current-tab-title').innerText = titles[tabId] || tabId.toUpperCase();

    // Carregamento de dados específicos
    if (tabId === 'ficha-tecnica') {
        carregarInsumosFicha();
        carregarProdutosFicha();
    }
    if (tabId === 'producao-insumos') {
        carregarPrecosInsumos();
    }
}

// --- CADASTRO DE CLIENTES ---
function salvarCliente() {
    const nome = document.getElementById('cli-nome').value;
    const fone = document.getElementById('cli-fone').value;
    if (!nome || !fone) { alert("Preencha todos os campos!"); return; }

    firebase.database().ref('clientes').push({
        nome: nome,
        telefone: fone,
        data: new Date().toLocaleDateString()
    }).then(() => {
        alert("Cliente salvo!");
        document.getElementById('cli-nome').value = "";
        document.getElementById('cli-fone').value = "";
    });
}

// --- GESTÃO DE INSUMOS ---
function salvarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const unidade = document.getElementById('ins-unidade').value;
    if (!nome) { alert("Informe o nome do insumo!"); return; }

    firebase.database().ref('insumos').push({
        nome: nome,
        unidade: unidade,
        custo: 0 
    }).then(() => {
        alert(nome + " cadastrado com sucesso!");
        document.getElementById('ins-nome').value = "";
    });
}

// GESTÃO DE PREÇOS DE COMPRA
function carregarPrecosInsumos() {
    const lista = document.getElementById('lista-precos-insumos');
    if (!lista) return;

    firebase.database().ref('insumos').on('value', (snapshot) => {
        lista.innerHTML = "";
        snapshot.forEach((child) => {
            const ins = child.val();
            const id = child.key;
            const unidadePadrao = ins.unidade || "Un"; // Correção do undefined

            lista.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:10px;">
                    <div style="font-size:12px;"><strong>${ins.nome}</strong> (${unidadePadrao})</div>
                    <div style="display:flex; gap:5px;">
                        <input type="number" step="0.01" id="preco-${id}" value="${ins.custo || 0}" style="width:75px; padding:5px;">
                        <button onclick="atualizarCustoInsumo('${id}')" style="background:var(--primary-color); color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">OK</button>
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
        recalcularCustosProdutos();
    });
}

// --- GESTÃO DE PRODUTOS (MIX) ---
function salvarProdutoMix() {
    const nome = document.getElementById('mix-nome').value;
    const precoVarejo = parseFloat(document.getElementById('mix-varejo').value) || 0;
    const precoAtacado = parseFloat(document.getElementById('mix-atacado').value) || 0;

    if (!nome) { alert("Informe o nome do Mix!"); return; }

    firebase.database().ref('produtos').push({
        nome: nome,
        preco_varejo: precoVarejo,
        preco_atacado: precoAtacado,
        custo_total: 0
    }).then(() => {
        alert("Produto criado!");
        document.getElementById('mix-nome').value = "";
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
            opt.text = child.val().nome + " (" + (child.val().unidade || "Un") + ")";
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
    const qtd = parseFloat(document.getElementById('ft-qtd').value) || 0;

    if (produtoId === "Selecione o Kit" || insumoId === "Insumo" || qtd <= 0) {
        alert("Preencha todos os dados!"); return;
    }

    firebase.database().ref('insumos/' + insumoId).once('value', (snapshot) => {
        const ins = snapshot.val();
        const subtotal = (ins.custo || 0) * qtd;

        firebase.database().ref('fichas_tecnicas/' + produtoId).push({
            insumoNome: ins.nome,
            insumoId: insumoId,
            quantidade: qtd,
            unidade: ins.unidade || "Un",
            subtotal: subtotal
        }).then(() => {
            document.getElementById('ft-qtd').value = "";
            atualizarCustoFinalProduto(produtoId);
            listarItensFicha(produtoId);
        });
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

function atualizarCustoFinalProduto(produtoId) {
    firebase.database().ref('fichas_tecnicas/' + produtoId).once('value', (snapshot) => {
        let total = 0;
        snapshot.forEach(c => total += c.val().subtotal);
        firebase.database().ref('produtos/' + produtoId).update({ custo_total: total });
    });
}

function recalcularCustosProdutos() {
    firebase.database().ref('produtos').once('value', (snapshot) => {
        snapshot.forEach(p => atualizarCustoFinalProduto(p.key));
    });
}

window.onload = () => { showTab('dashboard'); };
