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
        'ficha-tecnica': 'FICHA TÉCNICA',
        'vendas': 'CENTRAL DE VENDAS',
        'financeiro': 'RESUMO FINANCEIRO'
    };
    document.getElementById('current-tab-title').innerText = titles[tabId] || tabId.toUpperCase();

    // Carregamento automático ao abrir as abas
    if (tabId === 'vendas') {
        carregarClientesVenda();
    }
    if (tabId === 'ficha-tecnica') {
        carregarInsumosFicha();
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
        unidade: unidade
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

// Inicializa na Dashboard
window.onload = () => {
    showTab('dashboard');
};
