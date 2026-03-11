// --- NAVEGAÇÃO ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    const target = document.getElementById('tab-' + tabId);
    if (target) target.style.display = 'block';

    // Carregar dados específicos de cada aba
    if (tabId === 'insumos') listarInsumos();
    if (tabId === 'mix-kits') listarProdutos();
    if (tabId === 'vendas') prepararVenda();
    if (tabId === 'relatorios') carregarRelatorios();
}

// --- GESTÃO DE INSUMOS ---
function btnCadastrarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const unidade = document.getElementById('ins-unidade').value;
    if (!nome) return alert("Digite o nome do insumo!");

    firebase.database().ref('insumos').push({
        nome: nome,
        unidade: unidade,
        custo: 0,
        fc: 1.0
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
        snap.forEach(item => {
            lista.innerHTML += `<div style="padding:5px; border-bottom:1px solid #eee;">
                ${item.val().nome} (${item.val().unidade}) 
                <button onclick="deletarItem('insumos','${item.key}')" style="width:auto; padding:2px 5px; background:red; float:right;">X</button>
            </div>`;
        });
    });
}

// --- GESTÃO DE PRODUTOS (MIX) ---
function btnSalvarProduto() {
    const nome = document.getElementById('mix-nome').value;
    const precoV = parseFloat(document.getElementById('mix-varejo').value) || 0;
    const precoA = parseFloat(document.getElementById('mix-atacado').value) || 0;

    if (!nome) return alert("Digite o nome do Mix!");

    firebase.database().ref('produtos').push({
        nome: nome,
        preco_varejo: precoV,
        preco_atacado: precoA,
        custo_producao: 0
    }).then(() => {
        alert("Produto Salvo!");
        document.getElementById('mix-nome').value = "";
        document.getElementById('mix-varejo').value = "";
        document.getElementById('mix-atacado').value = "";
        listarProdutos();
    });
}

function listarProdutos() {
    const lista = document.getElementById('lista-produtos-cadastrados');
    firebase.database().ref('produtos').on('value', snap => {
        lista.innerHTML = "";
        snap.forEach(item => {
            lista.innerHTML += `<div style="padding:5px; border-bottom:1px solid #eee;">
                ${item.val().nome} - R$ ${item.val().preco_varejo.toFixed(2)}
                <button onclick="deletarItem('produtos','${item.key}')" style="width:auto; padding:2px 5px; background:red; float:right;">X</button>
            </div>`;
        });
    });
}

// --- VENDAS ---
function prepararVenda() {
    const select = document.getElementById('venda-produto-select');
    select.innerHTML = '<option value="">Selecione o Produto</option>';
    firebase.database().ref('produtos').once('value', snap => {
        snap.forEach(item => {
            let opt = document.createElement('option');
            opt.value = item.key;
            opt.text = item.val().nome;
            select.appendChild(opt);
        });
    });
}

function btnConfirmarVenda() {
    const idProd = document.getElementById('venda-produto-select').value;
    const valor = parseFloat(document.getElementById('venda-valor-input').value) || 0;
    
    if (!idProd || valor <= 0) return alert("Selecione o produto e o valor!");

    firebase.database().ref('vendas').push({
        produtoId: idProd,
        valor: valor,
        data: new Date().toLocaleDateString(),
        timestamp: Date.now()
    }).then(() => {
        alert("Venda realizada!");
        document.getElementById('venda-valor-input').value = "";
    });
}

// --- GERAL ---
function deletarItem(pasta, id) {
    if (confirm("Deseja realmente excluir?")) {
        firebase.database().ref(pasta + '/' + id).remove();
    }
}

window.onload = () => showTab('dashboard');
