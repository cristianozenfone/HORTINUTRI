// Função para trocar de abas (Tabs)
function showTab(tabId) {
    // Esconde todas as telas
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.style.display = 'none');

    // Remove a classe 'active' de todos os itens do menu
    const menuItems = document.querySelectorAll('.sidebar li');
    menuItems.forEach(item => item.classList.remove('active'));

    // Mostra a tela selecionada
    const selectedTab = document.getElementById('tab-' + tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }

    // Atualiza o título no topo
    const titles = {
        'dashboard': 'DASHBOARD',
        'clientes': 'CADASTRO DE CLIENTES',
        'insumos': 'GESTÃO DE INSUMOS',
        'ficha-tecnica': 'FICHA TÉCNICA',
        'vendas': 'CENTRAL DE VENDAS',
        'financeiro': 'RESUMO FINANCEIRO',
        'embalagens': 'CADASTRO DE EMBALAGENS',
        'mix-kits': 'GESTÃO DE MIX / KITS',
        'producao-insumos': 'PRODUÇÃO: INSUMOS',
        'producao-produtos': 'PRODUÇÃO: PRODUTOS',
        'relatorios': 'RELATÓRIOS GERAIS'
    };
    document.getElementById('current-tab-title').innerText = titles[tabId] || tabId.toUpperCase();

    // REGRA: Se abrir a tela de vendas, carrega os clientes do Firebase
    if (tabId === 'vendas') {
        carregarClientesVenda();
    }
}

// --- FUNÇÕES DE BANCO DE DADOS (FIREBASE) ---

// Salvar Cliente no Firebase
function salvarCliente() {
    const nome = document.getElementById('cli-nome').value;
    const fone = document.getElementById('cli-fone').value;

    if (nome === "" || fone === "") {
        alert("Por favor, preencha o nome e o WhatsApp do cliente!");
        return;
    }

    const novoClienteRef = firebase.database().ref('clientes').push();
    
    novoClienteRef.set({
        nome: nome,
        telefone: fone,
        dataCadastro: new Date().toLocaleDateString('pt-BR')
    }).then(() => {
        alert("Cliente " + nome + " salvo com sucesso!");
        document.getElementById('cli-nome').value = "";
        document.getElementById('cli-fone').value = "";
    }).catch((error) => {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar no banco de dados.");
    });
}

// Carregar Clientes no Select de Vendas
function carregarClientesVenda() {
    const selectVenda = document.getElementById('venda-cliente');
    
    // Limpa o select e deixa apenas a opção padrão
    if (selectVenda) {
        selectVenda.innerHTML = '<option>Selecionar Cliente</option>';

        firebase.database().ref('clientes').once('value', (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const cliente = childSnapshot.val();
                const option = document.createElement('option');
                option.value = childSnapshot.key;
                option.text = cliente.nome;
                selectVenda.appendChild(option);
            });
        });
    }
}

// Inicializa na Dashboard ao carregar a página
window.onload = () => {
    showTab('dashboard');
};
