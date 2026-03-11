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

    if (tabId === 'ficha-tecnica') { carregarInsumosFicha(); carregarProdutosFicha(); }
    if (tabId === 'producao-insumos') { carregarPrecosInsumos(); }
}

// --- FUNÇÃO GENÉRICA PARA REMOVER DO FIREBASE ---
function deletarRegistro(caminho, mensagem) {
    if (confirm("Tem certeza que deseja excluir " + mensagem + "?")) {
        firebase.database().ref(caminho).remove().then(() => {
            alert("Excluído com sucesso!");
        });
    }
}

// --- CADASTRO DE CLIENTES ---
function salvarCliente() {
    const nome = document.getElementById('cli-nome').value;
    const fone = document.getElementById('cli-fone').value;
    if (!nome || !fone) { alert("Preencha todos os campos!"); return; }
    firebase.database().ref('clientes').push({ nome, telefone: fone, data: new Date().toLocaleDateString() });
    document.getElementById('cli-nome').value = ""; document.getElementById('cli-fone').value = "";
}

// --- GESTÃO DE INSUMOS ---
function salvarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const unidade = document.getElementById('ins-unidade').value;
    if (!nome) { alert("Informe o nome!"); return; }
    firebase.database().ref('insumos').push({ nome, unidade, custo: 0 });
    document.getElementById('ins-nome').value = "";
}

// --- GESTÃO DE CUSTOS ---
function carregarPrecosInsumos() {
    const lista = document.getElementById('lista-precos-insumos');
    if (!lista) return;
    firebase.database().ref('insumos').on('value', (snapshot) => {
        lista.innerHTML = "";
        snapshot.forEach((child) => {
            const ins = child.val();
            const id = child.key;
            lista.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:10px;">
                    <div style="font-size:12px;"><strong>${ins.nome}</strong> (${ins.unidade || "Un"})</div>
                    <div style="display:flex; gap:5px; align-items:center;">
                        <input type="number" step="0.01" id="preco-${id}" value="${ins.custo || 0}" style="width:65px; padding:5px;">
                        <button onclick="atualizarCustoInsumo('${id}')" style="background:var(--primary-color); color:white; border:none; padding:8px; border-radius:5px;">OK</button>
                        <button onclick="deletarRegistro('insumos/${id}', 'este insumo')" style="background:none; border:none; color:red;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
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
    const v = parseFloat(document.getElementById('mix-varejo').value) || 0;
    const a = parseFloat(document.getElementById('mix-atacado').value) || 0;
    if (!nome) return;
    firebase.database().ref('produtos').push({ nome, preco_varejo: v, preco_atacado: a, custo_total: 0 });
    document.getElementById('mix-nome').value = "";
}

// --- FICHA TÉCNICA ---
function carregarInsumosFicha() {
    const s = document.getElementById('ft-insumo-item');
    if (!s) return; s.innerHTML = '<option>Insumo</option>';
    firebase.database().ref('insumos').once('value', (snap) => {
        snap.forEach((c) => {
            let o = document.createElement('option'); o.value = c.key;
            o.text = c.val().nome + " (" + (c.val().unidade || "Un") + ")"; s.appendChild(o);
        });
    });
}

function carregarProdutosFicha() {
    const s = document.getElementById('ft-produto');
    if (!s) return; s.innerHTML = '<option>Selecione o Kit</option>';
    firebase.database().ref('produtos').once('value', (snap) => {
        snap.forEach((c) => {
            let o = document.createElement('option'); o.value = c.key;
            o.text = c.val().nome; s.appendChild(o);
        });
    });
}

function adicionarItemFicha() {
    const pId = document.getElementById('ft-produto').value;
    const iId = document.getElementById('ft-insumo-item').value;
    const q = parseFloat(document.getElementById('ft-qtd').value) || 0;
    if (pId === "Selecione o Kit" || iId === "Insumo" || q <= 0) return;

    firebase.database().ref('insumos/' + iId).once('value', (snap) => {
        const ins = snap.val();
        const sub = (ins.custo || 0) * q;
        firebase.database().ref('fichas_tecnicas/' + pId).push({
            insumoNome: ins.nome, insumoId: iId, quantidade: q, unidade: ins.unidade || "Un", subtotal: sub
        }).then(() => {
            document.getElementById('ft-qtd').value = "";
            atualizarCustoFinalProduto(pId);
            listarItensFicha(pId);
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
            const itemId = child.key;
            lista.innerHTML += `
                <li style="display:flex; justify-content:space-between; align-items:center; background:#eee; padding:8px; margin-bottom:5px; border-radius:4px;">
                    <span>${item.insumoNome}: ${item.quantidade}${item.unidade} - R$ ${item.subtotal.toFixed(2)}</span>
                    <button onclick="removerItemFicha('${produtoId}', '${itemId}')" style="background:none; border:none; color:red; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </li>`;
        });
    });
}

function removerItemFicha(pId, iId) {
    if (confirm("Remover este item?")) {
        firebase.database().ref(`fichas_tecnicas/${pId}/${iId}`).remove().then(() => atualizarCustoFinalProduto(pId));
    }
}

function atualizarCustoFinalProduto(pId) {
    firebase.database().ref('fichas_tecnicas/' + pId).once('value', (snap) => {
        let t = 0; snap.forEach(c => t += c.val().subtotal);
        firebase.database().ref('produtos/' + pId).update({ custo_total: t });
    });
}

function recalcularCustosProdutos() {
    firebase.database().ref('produtos').once('value', (snap) => { snap.forEach(p => atualizarCustoFinalProduto(p.key)); });
}

window.onload = () => { showTab('dashboard'); };
