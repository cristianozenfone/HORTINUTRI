let meuGrafico = null;

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
    
    const target = document.getElementById('tab-' + tabId);
    if (target) target.style.display = 'block';

    const menu = Array.from(document.querySelectorAll('.sidebar li')).find(li => li.innerText.toLowerCase().includes(tabId.replace('-',' ')));
    if(menu) menu.classList.add('active');

    const titles = {
        'dashboard': 'DASHBOARD',
        'clientes': 'CLIENTES',
        'insumos': 'INSUMOS',
        'embalagens': 'EMBALAGENS',
        'mix-kits': 'PRODUTOS',
        'ficha-tecnica': 'FICHA TÉCNICA',
        'producao-insumos': 'GESTÃO DE CUSTOS',
        'vendas': 'VENDAS',
        'relatorios': 'RELATÓRIOS',
        'financeiro': 'FINANCEIRO'
    };

    document.getElementById('current-tab-title').innerText = titles[tabId] || tabId.toUpperCase();

    if (tabId === 'dashboard') atualizarGrafico();
    if (tabId === 'ficha-tecnica') {
        carregarInsumosFicha();
        carregarProdutosFicha();
    }
    if (tabId === 'producao-insumos') carregarPrecosInsumos();
    if (tabId === 'vendas') {
        carregarDadosVenda();
        listarVendas();
    }
    if (tabId === 'relatorios') gerarRelatorios();
    if (tabId === 'financeiro') listarDespesas();
}

function atualizarGrafico() {

    firebase.database().ref('vendas').once('value', (snap) => {

        const dados = {};

        snap.forEach(c => {

            const v = c.val();
            dados[v.data] = (dados[v.data] || 0) + v.valor;

        });

        const labels = Object.keys(dados).slice(-7);
        const valores = labels.map(l => dados[l]);

        const ctx = document.getElementById('graficoVendas').getContext('2d');

        if (meuGrafico) meuGrafico.destroy();

        meuGrafico = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Vendas R$',
                    data: valores,
                    backgroundColor: '#2e7d32',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

    });

}

function salvarCliente() {

    const nome = document.getElementById('cli-nome').value;
    const fone = document.getElementById('cli-fone').value;

    if (!nome) return alert("Digite o nome");

    firebase.database().ref('clientes').push({
        nome,
        telefone: fone
    }).then(() => {

        alert("Cliente Salvo!");
        document.getElementById('cli-nome').value = "";

    });

}

function salvarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const unidade = document.getElementById('ins-unidade').value;
    // Captura o FC do input do formulário. Se estiver vazio, usa 1.00
    const fc = parseFloat(document.getElementById('ins-fc').value) || 1.00;
    
    if (!nome) return alert("Por favor, digite o nome do insumo.");

    firebase.database().ref('insumos').push({
        nome: nome,
        unidade: unidade,
        custo: 0,
        fc: fc,
        estoque: 0
    }).then(() => {
        alert("Insumo Cadastrado com sucesso!");
        // Limpa os campos após salvar
        document.getElementById('ins-nome').value = "";
        document.getElementById('ins-fc').value = "";
    });
}

function salvarEmbalagem() {

    const nome = document.getElementById('emb-nome').value;
    const custo = parseFloat(document.getElementById('emb-custo').value) || 0;

    if (!nome) return;

    firebase.database().ref('embalagens').push({
        nome,
        custo
    }).then(() => alert("Embalagem Salva!"));

}

function carregarPrecosInsumos() {

    const lista = document.getElementById('lista-precos-insumos');

    firebase.database().ref('insumos').on('value', (snap) => {

        lista.innerHTML =
       "<table><thead><tr><th>Insumo</th><th>Estoque</th><th>Custo Compra</th><th>Ação</th></tr></thead><tbody id='body-custos'></tbody></table>";

        const body = document.getElementById('body-custos');

        snap.forEach((child) => {

            const i = child.val();
            const id = child.key;

            body.innerHTML += `
            <tr>
                <td>
                <strong>${i.nome}</strong>
                <br>
                <small>FC: ${i.fc || 1.00}</small>
                </td>

               <td>
<input type="number" id="estoque-${id}" value="${i.estoque || 0}" style="width:70px;">
</td>

<td>
<input type="number" step="0.01" id="preco-${id}" value="${i.custo || 0}" style="width:80px;">
</td>

                <td>
                <button onclick="atualizarCustoInsumo('${id}')" style="background:green;color:white;padding:5px 10px;border:none;border-radius:4px;cursor:pointer;">
                OK
                </button>
                </td>
            </tr>`;

        });

    });

}

function atualizarCustoInsumo(id) {

    const valor = parseFloat(document.getElementById('preco-' + id).value) || 0;
    const estoque = parseFloat(document.getElementById('estoque-' + id).value) || 0;

    firebase.database().ref('insumos/' + id).update({
        custo: valor,
        estoque: estoque
    }).then(() => {

        alert("Dados Atualizados!");
        recalcularTudo();

    });

}

function carregarInsumosFicha() {

    const s = document.getElementById('ft-insumo-item');

    s.innerHTML = '<option>Selecionar Insumo</option>';

    firebase.database().ref('insumos').once('value', s1 => {

        s1.forEach(c => {

            let o = document.createElement('option');

            o.value = c.key;
            o.text = c.val().nome;

            s.appendChild(o);

        });

    });

}

function carregarProdutosFicha() {

    const s = document.getElementById('ft-produto');

    s.innerHTML = '<option>Selecione o Kit</option>';

    firebase.database().ref('produtos').once('value', s1 => {

        s1.forEach(c => {

            let o = document.createElement('option');

            o.value = c.key;
            o.text = c.val().nome;

            s.appendChild(o);

        });

    });

}

function adicionarItemFicha() {
    const produtoId = document.getElementById('ft-produto').value;
    const insumoId = document.getElementById('ft-insumo-item').value;
    const insumoNome = document.getElementById('ft-insumo-item').options[document.getElementById('ft-insumo-item').selectedIndex].text;
    const qtd = document.getElementById('ft-qtd').value;

    if (!produtoId || produtoId === "Selecione o Kit" || !insumoId || !qtd) {
        return alert("Por favor, selecione o kit, o insumo e a quantidade!");
    }

    firebase.database().ref('insumos/' + insumoId).once('value', (snap) => {
        const ins = snap.val();
        const custoUnitario = ins.custo || 0;
        const fator = ins.fc || 1;
        const subtotal = (custoUnitario * fator) * parseFloat(qtd);

        firebase.database().ref(`fichas_tecnicas/${produtoId}`).push({
            insumoId: insumoId,
            nome: insumoNome,
            quantidade: parseFloat(qtd),
            subtotal: subtotal
        }).then(() => {
            document.getElementById('ft-qtd').value = "";
            console.log("Ingrediente adicionado!");
        });
    });
}

function listarItensFicha(produtoId) {
    const container = document.getElementById('lista-itens-ficha-container');
    if (!container) return;
    if (!produtoId || produtoId === "Selecione o Kit") {
        container.innerHTML = "";
        return;
    }

    firebase.database().ref('fichas_tecnicas/' + produtoId).on('value', (snapshot) => {
        let html = `
            <table style="width:100%; border-collapse: collapse; margin-top: 10px; background: white;">
                <thead>
                    <tr style="background: #f8f9fa; text-align: left;">
                        <th style="padding: 12px; border-bottom: 2px solid #eee;">Ingrediente</th>
                        <th style="padding: 12px; border-bottom: 2px solid #eee;">Qtd</th>
                        <th style="padding: 12px; border-bottom: 2px solid #eee;">Subtotal</th>
                        <th style="padding: 12px; border-bottom: 2px solid #eee; text-align: center;">Ação</th>
                    </tr>
                </thead>
                <tbody>`;

        if (snapshot.exists()) {
            snapshot.forEach((item) => {
                const d = item.val();
                const sub = d.subtotal ? d.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
                html += `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${d.nome}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${d.quantidade}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${sub}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                            <button onclick="firebase.database().ref('fichas_tecnicas/${produtoId}/${item.key}').remove()" 
                                    style="background:none; border:none; color:#d32f2f; cursor:pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>`;
            });
        } else {
            html += '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #888;">Nenhum ingrediente.</td></tr>';
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    });
}

window.onload = function() {
    if (typeof listarClientes === "function") listarClientes();
    if (typeof listarInsumos === "function") listarInsumos();
    if (typeof listarProdutosMix === "function") listarProdutosMix();
    if (typeof listarVendas === "function") listarVendas();
    if (typeof listarDespesas === "function") listarDespesas();
    if (typeof atualizarSelectsFichaTecnica === "function") atualizarSelectsFichaTecnica();
    if (typeof listarCustosInsumos === "function") listarCustosInsumos();
    
    const selectFT = document.getElementById('ft-produto');
    if(selectFT) {
        selectFT.addEventListener('change', function() {
            listarItensFicha(this.value);
        });
    }
};
