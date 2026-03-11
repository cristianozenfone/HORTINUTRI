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
        'financeiro': 'RESUMO FINANCEIRO'
    };
    document.getElementById('current-tab-title').innerText = titles[tabId] || tabId.toUpperCase();

    // Adiciona classe ativa no menu (opcional, busca pelo texto se necessário)
}

// --- FUNÇÕES DE BANCO DE DATA (FIREBASE) ---

function salvarCliente() {
    const nome = document.getElementById('cli-nome').value;
    const fone = document.getElementById('cli-fone').value;

    if (nome === "" || fone === "") {
        alert("Por favor, preencha o nome e o WhatsApp do cliente!");
        return;
    }

    // Criando uma "pasta" no Firebase chamada 'clientes'
    const novoClienteRef = firebase.database().ref('clientes').push();
    
    novoClienteRef.set({
        nome: nome,
        telefone: fone,
        dataCadastro: new Date().toLocaleDateString('pt-BR')
    }).then(() => {
        alert("Cliente " + nome + " salvo com sucesso!");
        // Limpa os campos após salvar
        document.getElementById('cli-nome').value = "";
        document.getElementById('cli-fone').value = "";
    }).catch((error) => {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar no banco de dados.");
    });
}

// Inicializa na Dashboard
window.onload = () => {
    showTab('dashboard');
};
