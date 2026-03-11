// Função para trocar de abas (Tabs)
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
        'vendas': 'CENTRAL DE VENDAS',
        'financeiro': 'RESUMO FINANCEIRO'
    };
    document.getElementById('current-tab-title').innerText = titles[tabId] || tabId.toUpperCase();

    // Carregamento automático ao abrir as abas (Sincronização com Firebase)
    if (tabId === 'vendas') {
        carregarClientesVenda();
        carregarProdutosVenda();
    }
    if (tabId === 'ficha-tecnica') {
        carregarInsumosFicha();
        carregarProdutosFicha(); // Agora carrega os Mixes para vincular a ficha
    }
}

// --- FUNÇÕES DE CLIENTES ---
function salvarCliente() {
    const nome = document.getElementById('cli-nome').value;
    const fone = document.getElementById('cli-fone').value;

    if (nome === "" || fone === "") {
        alert("Preencha o nome e o WhatsApp!");
        return;
    }

    firebase.database().ref('clientes').push({
        nome: nome,
        telefone: fone,
        dataCadastro: new Date().toLocaleDateString('pt-BR')
    }).then(() => {
        alert("Cliente salvo com sucesso!");
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
            const cli = child.val();
            const opt = document.createElement('option');
            opt.value = child.key;
            opt.text = cli.nome;
            select.appendChild(opt);
        });
    });
}

// --- FUNÇÕES DE INSUMOS ---
function salvarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const unidade = document.getElementById('ins-unidade').value;

    if (nome === "") {
        alert("Digite o nome do insumo!");
        return;
    }

    firebase.database().ref('insumos').push({
        nome: nome,
        unidade: unidade,
        custo: 0 // Valor inicial para ser editado depois
    }).then(() => {
        alert(nome + " cadastrado nos insumos!");
        document.getElementById('ins-nome').value = "";
    });
}

function carregarInsumosFicha() {
    const select = document.getElementById('ft-insumo-item');
    if (!select) return;
    select.innerHTML = '<option>Insumo</option>';

    firebase.database().ref('insumos').once('value', (snapshot) => {
        snapshot.forEach((child) => {
            const insumo = child.val();
            const opt = document.createElement('option');
            opt.value = child.key;
            opt.text = insumo.nome + " (" + insumo.unidade + ")";
            select.appendChild(opt);
        });
    });
}

// --- FUNÇÕES DE PRODUTOS (MIX / KITS) ---
function salvarProdutoMix() {
    const nome = document.getElementById('mix-nome').value;
    const categoria = document.getElementById('mix-categoria').value;
    const varejo = parseFloat(document.getElementById('mix-varejo').value) || 0;
    const atacado = parseFloat(document.getElementById('mix-atacado').value) || 0;

    if (nome === "") {
        alert("Digite o nome do Mix/Kit!");
        return;
    }

    firebase.database().ref('produtos').push({
        nome: nome,
        categoria: categoria,
        preco_varejo: varejo,
        preco_atacado: atacado,
        custo_total: 0 // Será calculado pela ficha técnica
    }).then(() => {
        alert("Produto " + nome + " criado! Vá para Ficha Técnica definir os ingredientes.");
        document.getElementById('mix-nome').value = "";
        document.getElementById('mix-categoria').value = "";
        document.getElementById('mix-varejo').value = "";
        document.getElementById('mix-atacado').value = "";
    });
}

function carregarProdutosFicha() {
    const select = document.getElementById('ft-produto');
    if (!select) return;
    select.innerHTML = '<option>Selecione o Kit</option>';

    firebase.database().ref('produtos').once('value', (snapshot) => {
        snapshot.forEach((child) => {
            const prod = child.val();
            const opt = document.createElement('option');
            opt.value = child.key;
            opt.text = prod.nome;
            select.appendChild(opt);
        });
    });
}

function carregarProdutosVenda() {
    const select = document.getElementById('venda-produto');
    if (!select) return;
    select.innerHTML = '<option>Selecionar Produto</option>';

    firebase.database().ref('produtos').once('value', (snapshot) => {
        snapshot.forEach((child) => {
            const prod = child.val();
            const opt = document.createElement('option');
            opt.value = child.key;
            opt.text = prod.nome;
            select.appendChild(opt);
        });
    });
}

// Inicializa na Dashboard
window.onload = () => {
    showTab('dashboard');
};
                         
