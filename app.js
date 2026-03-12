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

    const fc = parseFloat(prompt("Fator de Correção (FC):", "1.00")) || 1.00;

    if (!nome) return;

    firebase.database().ref('insumos').push({
        nome,
        unidade,
        custo: 0,
        fc: fc
    }).then(() => alert("Insumo Cadastrado!"));

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
        "<table><thead><tr><th>Insumo</th><th>Custo Compra</th><th>Ação</th></tr></thead><tbody id='body-custos'></tbody></table>";

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

    firebase.database().ref('insumos/' + id).update({
        custo: valor
    }).then(() => {

        alert("Custo Atualizado!");
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

    const pId = document.getElementById('ft-produto').value;
    const iId = document.getElementById('ft-insumo-item').value;

    const q = parseFloat(document.getElementById('ft-qtd').value) || 0;

    if (pId === "Selecione o Kit" || iId === "Selecionar Insumo" || q <= 0) return;

    firebase.database().ref('insumos/' + iId).once('value', (snap) => {

        const ins = snap.val();

        const sub = (ins.custo || 0) * q * (ins.fc || 1.00);

        firebase.database().ref('fichas_tecnicas/' + pId).push({

            insumoNome: ins.nome,
            quantidade: q,
            subtotal: sub

        }).then(() => {

            atualizarCustoFinal(pId);
            listarItensFicha(pId);

        });

    });

}

function listarItensFicha(pId) {

    const container = document.getElementById('lista-itens-ficha-container');

    firebase.database().ref('fichas_tecnicas/' + pId).on('value', (snap) => {

        container.innerHTML =
        "<table><thead><tr><th>Ingrediente</th><th>Qtd</th><th>Subtotal</th></tr></thead><tbody id='body-itens-ficha'></tbody></table>";

        const body = document.getElementById('body-itens-ficha');

        snap.forEach(c => {

            body.innerHTML += `
            <tr>
            <td>${c.val().insumoNome}</td>
            <td>${c.val().quantidade}</td>
            <td><span class="badge">R$ ${c.val().subtotal.toFixed(2)}</span></td>
            </tr>`;

        });

    });

}

function atualizarCustoFinal(pId) {

    firebase.database().ref('fichas_tecnicas/' + pId).once('value', (snap) => {

        let t = 0;

        snap.forEach(c => t += c.val().subtotal);

        firebase.database().ref('produtos/' + pId).update({
            custo_total: t
        });

    });

}

function recalcularTudo() {

    firebase.database().ref('produtos').once('value', (snap) => {

        snap.forEach(p => atualizarCustoFinal(p.key));

    });

}

function carregarDadosVenda() {

    const cli = document.getElementById('venda-cliente');
    const pro = document.getElementById('venda-produto');

    cli.innerHTML = '<option>Selecionar Cliente</option>';
    pro.innerHTML = '<option>Selecionar Produto</option>';

    firebase.database().ref('clientes').once('value', s => {

        s.forEach(c => {

            let o = document.createElement('option');

            o.value = c.key;
            o.text = c.val().nome;

            cli.appendChild(o);

        });

    });

    firebase.database().ref('produtos').once('value', s => {

        s.forEach(p => {

            let o = document.createElement('option');

            o.value = p.key;
            o.text = p.val().nome;

            pro.appendChild(o);

        });

    });

}

function preencherPrecoVenda(id) {

    firebase.database().ref('produtos/' + id).once('value', s => {

        document.getElementById('venda-valor').value = s.val().preco_varejo || 0;

    });

}

function finalizarVenda() {

    const pId = document.getElementById('venda-produto').value;

    const valor = parseFloat(document.getElementById('venda-valor').value) || 0;

    const quantidade = parseInt(document.getElementById('venda-qtd').value) || 1;

    const cliSelect = document.getElementById('venda-cliente');

    const cliNome = cliSelect.options[cliSelect.selectedIndex].text;

    if(!pId) {

        alert("Selecione um produto");
        return;

    }

    firebase.database().ref('produtos/' + pId).once('value', s => {

        const p = s.val();

        const custoUnitario = p.custo_total || 0;

        const custoTotal = custoUnitario * quantidade;

        const valorTotal = valor * quantidade;

        const lucro = valorTotal - custoTotal;

        firebase.database().ref('vendas').push({

            cliente: cliNome,
            produto: p.nome,
            quantidade: quantidade,
            valor: valorTotal,
            lucro: lucro,
            data: new Date().toLocaleDateString()

        }).then(() => {

            alert("Venda Realizada!");

            listarVendas();
            atualizarGrafico();

        });

    });

}

function listarVendas() {

    const container = document.getElementById('lista-vendas-recente');

    firebase.database().ref('vendas').limitToLast(5).on('value', s => {

        container.innerHTML =
        "<table><thead><tr><th>Cliente</th><th>Produto</th><th>Qtd</th><th>Valor</th></tr></thead><tbody id='body-vendas-recente'></tbody></table>";

        const body = document.getElementById('body-vendas-recente');

        s.forEach(c => {

            const v = c.val();

            body.innerHTML += `
            <tr>
            <td><strong>${v.cliente}</strong></td>
            <td>${v.produto}</td>
            <td>${v.quantidade || 1}</td>
            <td><span class="badge">R$ ${v.valor.toFixed(2)}</span></td>
            </tr>`;

        });

    });

}

function gerarRelatorios() {

    firebase.database().ref('vendas').on('value', (snap) => {

        let totalVendas = 0;
        let totalLucro = 0;

        let html =
        "<table><thead><tr><th>Data</th><th>Produto</th><th>Valor</th><th>Lucro</th></tr></thead><tbody>";

        snap.forEach(c => {

            const v = c.val();

            totalVendas += v.valor;
            totalLucro += v.lucro;

            html += `
            <tr>
            <td>${v.data}</td>
            <td>${v.produto}</td>
            <td>R$ ${v.valor.toFixed(2)}</td>
            <td><span class="badge">R$ ${v.lucro.toFixed(2)}</span></td>
            </tr>`;

        });

        html += "</tbody></table>";

        document.getElementById('rep-total-vendas').innerText = "R$ " + totalVendas.toFixed(2);
        document.getElementById('rep-total-lucro').innerText = "R$ " + totalLucro.toFixed(2);
        document.getElementById('rep-lista-produtos').innerHTML = html;

    });

}

function listarDespesas() {

    const container = document.getElementById('lista-despesas');

    firebase.database().ref('despesas').on('value', s => {

        container.innerHTML =
        "<table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody id='body-despesas'></tbody></table>";

        const body = document.getElementById('body-despesas');

        s.forEach(c => {

            body.innerHTML += `
            <tr>
            <td>${c.val().data}</td>
            <td>${c.val().descricao}</td>
            <td>R$ ${c.val().valor.toFixed(2)}</td>
            </tr>`;

        });

    });

}

window.onload = () => {

    showTab('dashboard');

};
