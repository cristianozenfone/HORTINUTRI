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

    // Buscamos o custo e FC do insumo antes de salvar para ter o subtotal exato
    firebase.database().ref('insumos/' + insumoId).once('value', (snap) => {
        const ins = snap.val();
        const custoUnitario = ins.custo || 0;
        const fator = ins.fc || 1;
        const subtotal = (custoUnitario * fator) * parseFloat(qtd);

        // O .push() cria um NOVO item na lista, permitindo vários ingredientes
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
            produtoId: pId,
            quantidade: quantidade,
            valor: valorTotal,
            lucro: lucro,
            data: new Date().toLocaleDateString()

        }).then(() => {

            baixarEstoque(pId, quantidade);

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
    listarProdutosMix();
};

function salvarProdutoMix(){

    const nome = document.getElementById('mix-nome').value;
    const preco = parseFloat(document.getElementById('mix-varejo').value) || 0;

    if(!nome){
        alert("Digite o nome do produto");
        return;
    }

    firebase.database().ref('produtos').push({
        nome: nome,
        preco_varejo: preco,
        custo_total: 0
    }).then(()=>{
        alert("Produto criado!");
        document.getElementById('mix-nome').value = "";
document.getElementById('mix-varejo').value = "";
    });

}

function baixarEstoque(produtoId, qtdVenda){

    firebase.database().ref('fichas_tecnicas/' + produtoId).once('value', snap => {

        snap.forEach(item => {

            const insumo = item.val();
            const nome = insumo.insumoNome.toLowerCase().trim();
            const qtdUsada = insumo.quantidade * qtdVenda;

            firebase.database().ref('insumos').once('value', lista => {

                lista.forEach(i => {

                    const dados = i.val();

                    if(dados.nome.toLowerCase().trim() === nome){

                        let atual = parseFloat(dados.estoque) || 0;
                        let novo = atual - qtdUsada;

                        if(novo < 0) novo = 0;

                        firebase.database().ref('insumos/' + i.key).update({
                            estoque: novo.toFixed(2)
                        });

                    }

                });

            });

        });

    });

}
function excluirProduto(id){

    if(!confirm("Deseja realmente excluir este produto?")) return;

    firebase.database().ref('fichas_tecnicas/' + id).remove();

    firebase.database().ref('produtos/' + id).remove()
    .then(()=>{
        alert("Produto excluído com sucesso!");
    });

}
function listarProdutosMix(){

    firebase.database().ref('produtos').on('value', snap => {

        let html = "";

        snap.forEach(item => {

            const id = item.key;
            const p = item.val();

            html += `
            <div style="margin-top:8px;">
                ${p.nome} - R$ ${p.preco_varejo}
                <button onclick="excluirProduto('${id}')">Excluir</button>
            </div>
            `;

        });

        document.getElementById('lista-produtos-mix').innerHTML = html;

    });

}
function editarPrecoProduto(id, precoAtual){

    let novoPreco = prompt("Digite o novo preço:", precoAtual);

    if(novoPreco === null) return;

    firebase.database().ref('produtos/' + id).update({
        preco_varejo: parseFloat(novoPreco)
    }).then(()=>{
        alert("Preço atualizado!");
    });

}
function calcularCustoProduto(produtoId){

    let custoTotal = 0;

    firebase.database().ref('fichas_tecnicas/' + produtoId).once('value', snap => {

        snap.forEach(item => {

            const dados = item.val();
            const qtd = parseFloat(dados.quantidade) || 0;
            const custo = parseFloat(dados.custo) || 0;

            custoTotal += qtd * custo;

        });

        firebase.database().ref('produtos/' + produtoId).update({
            custo_total: custoTotal.toFixed(2)
        });

    });

}
// Função para carregar e exibir os clientes
function listarClientes() {
    const corpoTabela = document.getElementById('lista-clientes-corpo');
    
    firebase.database().ref('clientes').on('value', (snapshot) => {
        corpoTabela.innerHTML = ""; // Limpa a tabela antes de listar
        
        snapshot.forEach((item) => {
            const cliente = item.val();
            const id = item.key;
            
            corpoTabela.innerHTML += `
                <tr>
                    <td>${cliente.nome}</td>
                    <td>${cliente.fone}</td>
                    <td>
                        <button onclick="excluirCliente('${id}')" style="background:none; border:none; color:red; cursor:pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    });
}

// Função para excluir cliente (opcional, mas recomendada)
function excluirCliente(id) {
    if(confirm("Deseja realmente excluir este cliente?")) {
        firebase.database().ref('clientes/' + id).remove();
    }
}

// CHAME A FUNÇÃO AO CARREGAR O APP
listarClientes();
// Função para carregar e exibir os Insumos
function listarInsumos() {
    const corpoTabela = document.getElementById('lista-insumos-corpo');
    
    firebase.database().ref('insumos').on('value', (snapshot) => {
        if (corpoTabela) {
            corpoTabela.innerHTML = ""; 
            
            snapshot.forEach((item) => {
                const insumo = item.val();
                const id = item.key;
                
                // Se o FC não existir no banco para itens antigos, ele exibe 1.00 por padrão
                const fcExibicao = insumo.fc ? insumo.fc.toFixed(2) : "1.00";
                
                corpoTabela.innerHTML += `
                    <tr>
                        <td><strong>${insumo.nome}</strong></td>
                        <td><span class="badge">${insumo.unidade}</span></td>
                        <td>${fcExibicao}</td>
                        <td style="text-align: center;">
                            <button onclick="excluirInsumo('${id}')" style="background:none; border:none; color:#d32f2f; cursor:pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    });
}

// Função para excluir Insumo
function excluirInsumo(id) {
    if(confirm("Deseja remover este insumo do sistema?")) {
        firebase.database().ref('insumos/' + id).remove();
    }
}

// Chame a função para iniciar a listagem assim que abrir o ERP
listarInsumos();
// --- FUNÇÕES DE BUSCA (ADICIONE NO FINAL DO APP.JS) ---

function carregarDadosIniciais() {
    // 1. Busca Clientes e joga na tabela
    firebase.database().ref('clientes').on('value', (snapshot) => {
        const corpoClientes = document.getElementById('lista-clientes-corpo');
        if (corpoClientes) {
            corpoClientes.innerHTML = "";
            snapshot.forEach((item) => {
                const c = item.val();
                corpoClientes.innerHTML += `
                    <tr>
                        <td>${c.nome}</td>
                        <td>${c.fone}</td>
                        <td><button onclick="firebase.database().ref('clientes/${item.key}').remove()" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button></td>
                    </tr>`;
            });
        }
    });

    // 2. Busca Insumos e joga na tabela
    firebase.database().ref('insumos').on('value', (snapshot) => {
        const corpoInsumos = document.getElementById('lista-insumos-corpo');
        if (corpoInsumos) {
            corpoInsumos.innerHTML = "";
            snapshot.forEach((item) => {
                const i = item.val();
                corpoInsumos.innerHTML += `
                    <tr>
                        <td>${i.nome}</td>
                        <td><span class="badge">${i.unidade}</span></td>
                        <td>${i.fc ? i.fc : '1.00'}</td>
                        <td><button onclick="firebase.database().ref('insumos/${item.key}').remove()" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button></td>
                    </tr>`;
            });
        }
    });
}

// IMPORTANTE: Essa linha abaixo faz as funções rodarem assim que o site abrir
carregarDadosIniciais();
// --- LÓGICA DA FICHA TÉCNICA (ADICIONE AO FINAL DO APP.JS) ---

function adicionarItemFicha() {
    const produtoId = document.getElementById('ft-produto').value;
    const insumoId = document.getElementById('ft-insumo-item').value;
    const insumoNome = document.getElementById('ft-insumo-item').options[document.getElementById('ft-insumo-item').selectedIndex].text;
    const qtd = parseFloat(document.getElementById('ft-qtd').value);

    if (!produtoId || !insumoId || !qtd) return alert("Selecione o produto, o insumo e a quantidade!");

    // Salva o ingrediente dentro do produto selecionado
    firebase.database().ref(`fichas_tecnicas/${produtoId}`).push({
        insumoId: insumoId,
        nome: insumoNome,
        qtd: qtd
    }).then(() => {
        alert("Ingrediente adicionado!");
        document.getElementById('ft-qtd').value = "";
    });
}

function listarItensFicha(produtoId) {
    const container = document.getElementById('lista-itens-ficha-container');
    if (!container || !produtoId) return;

    firebase.database().ref(`fichas_tecnicas/${produtoId}`).on('value', (snapshot) => {
        container.innerHTML = `
            <table>
                <thead>
                    <tr><th>Ingrediente</th><th>Qtd</th><th>Ação</th></tr>
                </thead>
                <tbody id="corpo-ficha"></tbody>
            </table>`;
        
        const corpo = document.getElementById('corpo-ficha');
        snapshot.forEach((item) => {
            const dado = item.val();
            corpo.innerHTML += `
                <tr>
                    <td>${dado.nome}</td>
                    <td>${dado.qtd}</td>
                    <td><button onclick="firebase.database().ref('fichas_tecnicas/${produtoId}/${item.key}').remove()" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button></td>
                </tr>`;
        });
    });
}

// Faz a lista atualizar toda vez que você mudar o produto no select lá em cima
document.getElementById('ft-produto').addEventListener('change', function() {
    listarItensFicha(this.value);
});
// --- FUNÇÃO PARA PREENCHER OS SELECTS AUTOMATICAMENTE ---

function atualizarSelectsFichaTecnica() {
    const selectProduto = document.getElementById('ft-produto');
    const selectInsumo = document.getElementById('ft-insumo-item');

    // 1. Busca os Produtos (Mix/Kits) para o primeiro select
    firebase.database().ref('produtos_mix').on('value', (snapshot) => {
        if (selectProduto) {
            selectProduto.innerHTML = '<option value="">Selecione o Kit...</option>';
            snapshot.forEach((item) => {
                const p = item.val();
                selectProduto.innerHTML += `<option value="${item.key}">${p.nome}</option>`;
            });
        }
    });

    // 2. Busca os Insumos para o segundo select
    firebase.database().ref('insumos').on('value', (snapshot) => {
        if (selectInsumo) {
            selectInsumo.innerHTML = '<option value="">Selecione o Insumo...</option>';
            snapshot.forEach((item) => {
                const i = item.val();
                selectInsumo.innerHTML += `<option value="${item.key}">${i.nome}</option>`;
            });
        }
    });
}

// EXECUTA AO CARREGAR O SISTEMA
atualizarSelectsFichaTecnica();
// --- GESTÃO DE MIX / KITS (PRODUTOS FINAIS) ---

function listarProdutosMix() {
    const corpoTabela = document.getElementById('lista-produtos-mix-corpo');
    if (!corpoTabela) return;

    firebase.database().ref('produtos_mix').on('value', (snapshot) => {
        corpoTabela.innerHTML = "";
        snapshot.forEach((item) => {
            const p = item.val();
            const preco = p.varejo ? parseFloat(p.varejo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
            
            corpoTabela.innerHTML += `
                <tr>
                    <td><strong>${p.nome}</strong></td>
                    <td>${preco}</td>
                    <td style="text-align: center;">
                        <button onclick="firebase.database().ref('produtos_mix/${item.key}').remove()" style="background:none; border:none; color:#d32f2f; cursor:pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });
    });
}

// IMPORTANTE: Chame a função para ela rodar ao abrir o site
listarProdutosMix();
// --- GESTÃO DE CUSTOS (PREÇOS DE COMPRA) ---
function listarCustosInsumos() {
    const container = document.getElementById('lista-precos-insumos');
    if (!container) return;

    firebase.database().ref('insumos').on('value', (snapshot) => {
        container.innerHTML = "";
        snapshot.forEach((item) => {
            const i = item.val();
            container.innerHTML += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee;">
                    <span><strong>${i.nome}</strong> (${i.unidade})</span>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        R$ <input type="number" step="0.01" value="${i.custo || 0}" 
                            onchange="atualizarCustoInsumo('${item.key}', this.value)" 
                            style="width: 80px; margin: 0; padding: 5px;">
                    </div>
                </div>`;
        });
    });
}

function atualizarCustoInsumo(id, novoCusto) {
    firebase.database().ref(`insumos/${id}`).update({
        custo: parseFloat(novoCusto)
    }).then(() => console.log("Custo atualizado"));
}

// --- SISTEMA DE VENDAS ---
function atualizarSelectsVendas() {
    const selCliente = document.getElementById('venda-cliente');
    const selProduto = document.getElementById('venda-produto');

    firebase.database().ref('clientes').on('value', snap => {
        if(selCliente) {
            selCliente.innerHTML = '<option value="">Selecione o Cliente</option>';
            snap.forEach(item => { selCliente.innerHTML += `<option value="${item.key}">${item.val().nome}</option>`; });
        }
    });

    firebase.database().ref('produtos_mix').on('value', snap => {
        if(selProduto) {
            selProduto.innerHTML = '<option value="">Selecione o Produto</option>';
            snap.forEach(item => { selProduto.innerHTML += `<option value="${item.key}">${item.val().nome}</option>`; });
        }
    });
}

function finalizarVenda() {
    const cliente = document.getElementById('venda-cliente').options[document.getElementById('venda-cliente').selectedIndex].text;
    const produto = document.getElementById('venda-produto').options[document.getElementById('venda-produto').selectedIndex].text;
    const valor = document.getElementById('venda-valor').value;
    const qtd = document.getElementById('venda-qtd').value;

    if (!valor || valor <= 0) return alert("Insira o valor da venda!");

    firebase.database().ref('vendas').push({
        cliente: cliente,
        produto: produto,
        qtd: qtd,
        total: parseFloat(valor),
        data: new Date().toLocaleDateString('pt-BR')
    }).then(() => {
        alert("Venda registrada!");
        document.getElementById('venda-valor').value = "";
    });
}

function listarVendas() {
    const corpo = document.getElementById('lista-vendas-corpo');
    firebase.database().ref('vendas').limitToLast(10).on('value', snap => {
        if(!corpo) return;
        corpo.innerHTML = "";
        snap.forEach(item => {
            const v = item.val();
            corpo.innerHTML += `
                <tr>
                    <td>${v.cliente}</td>
                    <td>${v.qtd}x ${v.produto}</td>
                    <td>R$ ${v.total.toFixed(2)}</td>
                    <td><button onclick="firebase.database().ref('vendas/${item.key}').remove()">❌</button></td>
                </tr>`;
        });
    });
}

// Inicializa as funções
listarCustosInsumos();
atualizarSelectsVendas();
listarVendas();
// --- FINANCEIRO ---
function salvarDespesa() {
    const desc = document.getElementById('fin-desc').value;
    const valor = document.getElementById('fin-valor').value;
    if (!desc || !valor) return alert("Preencha descrição e valor!");

    firebase.database().ref('financeiro').push({
        descricao: desc,
        valor: parseFloat(valor),
        data: new Date().toLocaleDateString('pt-BR')
    }).then(() => {
        alert("Gasto registrado!");
        document.getElementById('fin-desc').value = "";
        document.getElementById('fin-valor').value = "";
    });
}

// --- COPIE A PARTIR DAQUI ---

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
                        <th style="padding: 12px; border-bottom: 2px solid #eee; text-align: center;">Ação</th>
                    </tr>
                </thead>
                <tbody>`;

        if (snapshot.exists()) {
            snapshot.forEach((item) => {
                const dado = item.val();
                html += `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${dado.insumoNome || 'Item'}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${dado.quantidade}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                            <button onclick="firebase.database().ref('fichas_tecnicas/${produtoId}/${item.key}').remove()" 
                                    style="background:none; border:none; color:#d32f2f; cursor:pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>`;
            });
        } else {
            html += '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #888;">Nenhum ingrediente.</td></tr>';
        }

        html += '</tbody></table>';
        container.innerHTML = html;
    });
}

// Inicialização final do HortiNutri+
window.onload = function() {
    if (typeof listarClientes === "function") listarClientes();
    if (typeof listarInsumos === "function") listarInsumos();
    if (typeof listarProdutosMix === "function") listarProdutosMix();
    if (typeof listarVendas === "function") listarVendas();
    if (typeof listarDespesas === "function") listarDespesas();
    if (typeof atualizarSelectsFichaTecnica === "function") atualizarSelectsFichaTecnica();
    
    const selectFT = document.getElementById('ft-produto');
    if(selectFT) {
        selectFT.addEventListener('change', function() {
            listarItensFicha(this.value);
        });
    }
};
