// Controle de Abas (Navegação)
function showTab(tabId) {
    // Esconde todas as telas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Mostra a tela selecionada
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) {
        targetTab.style.display = 'block';
    }

    // Atualiza o título no topo
    document.getElementById('current-tab-title').innerText = tabId.toUpperCase();
    
    // Marca o item ativo no menu
    document.querySelectorAll('nav ul li').forEach(li => li.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// Inicialização
window.onload = () => {
    console.log("HortiNutri ERP v11.0 Pronto!");
    // Inicia na Dashboard
    showTab('dashboard');
};

// Funções de Venda (Base)
let carrinho = [];
function adicionarItemVenda() {
    const prod = document.getElementById('venda-produto').value;
    const qtd = document.getElementById('venda-qtd').value;
    if(prod && qtd) {
        carrinho.push({ prod, qtd });
        renderCarrinho();
    }
}

function renderCarrinho() {
    const lista = document.getElementById('carrinho-venda');
    lista.innerHTML = carrinho.map(i => `<p>${i.qtd}x ${i.prod}</p>`).join('');
}
