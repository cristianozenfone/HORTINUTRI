// Controle de Abas (Navegação)
function showTab(tabId) {
    // 1. Esconde todas as telas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // 2. Mostra a tela selecionada
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) {
        targetTab.style.display = 'block';
    } else {
        // Caso a aba ainda não exista no HTML, mostra um aviso simples
        console.warn("Aba não encontrada: " + tabId);
    }

    // 3. Atualiza o título no topo
    const tabTitles = {
        'dashboard': 'DASHBOARD',
        'clientes': 'CADASTRO DE CLIENTES',
        'insumos': 'GESTÃO DE INSUMOS',
        'embalagens': 'EMBALAGENS',
        'mix-kits': 'MIX E KITS',
        'ficha-tecnica': 'FICHA TÉCNICA',
        'producao': 'PRODUÇÃO',
        'estoque-insumos': 'ESTOQUE DE INSUMOS',
        'estoque-produtos': 'ESTOQUE DE PRODUTOS',
        'vendas': 'SISTEMA DE VENDAS',
        'relatorios': 'RELATÓRIOS',
        'financeiro': 'FINANCEIRO'
    };
    
    document.getElementById('current-tab-title').innerText = tabTitles[tabId] || tabId.toUpperCase();
    
    // 4. Marca o item ativo no menu (Correção do 'event')
    document.querySelectorAll('nav ul li').forEach(li => li.classList.remove('active'));
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

// Inicialização
window.onload = () => {
    console.log("HortiNutri ERP v11.0 Pronto!");
    // Garante que comece na Dashboard
    const dashboardTab = document.getElementById('tab-dashboard');
    if(dashboardTab) dashboardTab.style.display = 'block';
};

// Funções de Venda (Base)
let carrinho = [];
function adicionarItemVenda() {
    const prod = document.getElementById('venda-produto').value;
    const qtd = document.getElementById('venda-qtd').value;
    if(prod && qtd) {
        carrinho.push({ prod, qtd });
        renderCarrinho();
        // Limpa os campos após adicionar
        document.getElementById('venda-qtd').value = '';
    } else {
        alert("Selecione um produto e a quantidade!");
    }
}

function renderCarrinho() {
    const lista = document.getElementById('carrinho-venda');
    if (lista) {
        lista.innerHTML = carrinho.map((i, index) => `
            <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #eee;">
                <span>${i.qtd}x ${i.prod}</span>
                <button onclick="removerItem(${index})" style="color:red; border:none; background:none; cursor:pointer;">X</button>
            </div>
        `).join('');
    }
}

function removerItem(index) {
    carrinho.splice(index, 1);
    renderCarrinho();
}
