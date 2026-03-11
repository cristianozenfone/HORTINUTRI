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

    if (tabId === 'vendas') {
        carregarClientesVenda();
    }
}

// --- FUNÇÕES DE BANCO DE DADOS (FIREBASE) ---

function salvarCliente() {
    console.log("Botão salvar clicado"); // Log para debug no PC

    const nomeInput = document.getElementById('cli-nome');
    const foneInput = document.getElementById('cli-fone');

    if (!nomeInput || !foneInput) {
        alert("Erro: Campos de entrada não encontrados no HTML.");
        return;
    }

    const nome = nomeInput.value;
    const fone = foneInput.value;

    if (nome === "" || fone === "") {
        alert("Por favor, preencha o nome e o WhatsApp do cliente!");
        return;
    }

    // DIAGNÓSTICO: Verifica se o Firebase foi configurado
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        alert("ALERTA: O Firebase não foi inicializado. Verifique se você colou as chaves de configuração no firebase.js ou index.html.");
        return;
    }

    const novoClienteRef = firebase.database().ref('clientes').push();
    
    novoClienteRef.set({
        nome: nome,
        telefone: fone,
        dataCadastro: new Date().toLocaleDateString('pt-BR')
    }).then(() => {
        alert("Cliente " + nome + " salvo com sucesso!");
        nomeInput.value = "";
        foneInput.value = "";
    }).catch((error) => {
        alert("Erro do Firebase: " + error.message);
        console.error("Erro ao salvar:", error);
    });
}

function carregarClientesVenda() {
    const selectVenda = document.getElementById('venda-cliente');
    if (!selectVenda) return;
    
    selectVenda.innerHTML = '<option>Selecionar Cliente</option>';

    if (typeof firebase !== 'undefined' && firebase.apps.length) {
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

window.onload = () => {
    showTab('dashboard');
};
