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
    if (tabId === 'clientes') listarClientes();
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

// ==========================================
// MÓDULO 1: GESTÃO DE CLIENTES (HORTINUTRI+)
// ==========================================

// 1. Função para Salvar ou Atualizar Cliente
function salvarCliente() {
    const id = document.getElementById('cli-id').value;
    const nome = document.getElementById('cli-nome').value;
    const tipo = document.getElementById('cli-tipo').value;
    const status = document.getElementById('cli-status').value; // Novo Campo
    const cep = document.getElementById('cli-cep').value;
    const fone = document.getElementById('cli-fone').value;
    const endereco = document.getElementById('cli-endereco').value;
    const obs = document.getElementById('cli-obs').value; // Campo de Observação

    // Validação estrita: Não salva se faltar os campos principais
    if (!nome || !tipo || !cep || !fone) {
        return alert("⚠️ ERRO: Nome, Tipo, CEP e Telefone são obrigatórios!");
    }

    const dadosCliente = {
        nome: nome,
        tipo: tipo,
        status: status, // Salva o Status
        cep: cep,
        fone: fone,
        endereco: endereco,
        obs: obs, // Salva a Observação
        dataCadastro: new Date().toLocaleDateString('pt-BR'),
        situacaoFinanceira: 0 // Base para o futuro módulo financeiro
    };

    if (id) {
        // Se tem ID oculto, é uma ATUALIZAÇÃO (Edição)
        firebase.database().ref('clientes/' + id).update(dadosCliente)
            .then(() => { 
                alert("✅ Cliente atualizado com sucesso!"); 
                limparFormularioCliente(); 
            });
    } else {
        // Se NÃO tem ID, é um NOVO CADASTRO
        firebase.database().ref('clientes').push(dadosCliente)
            .then(() => { 
                alert("🚀 Cliente cadastrado com sucesso!"); 
                limparFormularioCliente(); 
            });
    }
}

// 2. Função para Listar Clientes em Tempo Real (BLINDADA)
function listarClientes() {
    const container = document.getElementById('lista-clientes-container');
    if (!container) return;

    // O .on('value') faz a lista atualizar sozinha sempre que o banco mudar
    firebase.database().ref('clientes').on('value', (snap) => {
        let html = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background: #f8f9fa; text-align: left;">
                        <th style="padding: 10px; border-bottom: 2px solid #ddd;">Cliente / Endereço</th>
                        <th style="padding: 10px; border-bottom: 2px solid #ddd;">Tipo</th>
                        <th style="padding: 10px; border-bottom: 2px solid #ddd;">Contato</th>
                        <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align:center;">Ações</th>
                    </tr>
                </thead>
                <tbody>`;

        if (!snap.exists()) {
            html += `<tr><td colspan="4" style="text-align:center; padding: 20px;">Nenhum cliente cadastrado ainda.</td></tr>`;
        } else {
            snap.forEach(item => {
                const c = item.val();
                const id = item.key;
                
                // PROTEÇÃO ANTI-ERROS
                const tipo = c.tipo || 'N/A';
                const status = c.status || 'ATIVO'; // Padrão Ativo
                const endExibir = c.endereco || 'Endereço não informado';
                const fone = c.fone || c.telefone || 'Sem Fone';
                const financeiro = c.situacaoFinanceira || 0;
                const observacao = c.obs || ""; // Pega a observação
                
                // Cor da etiqueta
                const badgeColor = tipo === 'ATACADO' ? '#1565c0' : '#2e7d32';

                // Bolinha de Status
                const bolinha = status === 'ATIVO' ? '🟢' : '⚪';

                // Link para o Google Maps
                const linkMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endExibir)}`;

                // Bloco de HTML da Observação (só aparece se existir texto)
                const htmlObs = observacao ? `<small style="display: block; color: #795548; font-style: italic; margin-top: 4px;"><i class="fas fa-sticky-note"></i> ${observacao}</small>` : "";

                html += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px;">
                            <strong>${bolinha} ${c.nome}</strong><br>
                            <small style="display: block; margin-top: 4px;">
                                <a href="${linkMapa}" target="_blank" style="text-decoration: none; color: #666;">
                                    <i class="fas fa-map-marker-alt" style="color: #2e7d32;"></i> ${endExibir}
                                </a>
                            </small>
                            ${htmlObs}
                        </td>
                        <td style="padding: 10px;"><span style="background:${badgeColor}; color:white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${tipo}</span></td>
                        <td style="padding: 10px;">${fone}</td>
                        <td style="padding: 10px; text-align:center;">
                            <button onclick="prepararEdicao('${id}')" title="Editar" style="color:#1976d2; border:none; background:none; cursor:pointer; font-size: 16px; margin-right: 10px;"><i class="fas fa-edit"></i></button>
                            
                            <button id="del-${id}" onclick="confirmarExclusao('${id}')" title="Excluir" style="color:#d32f2f; border:none; background:none; cursor:pointer; font-size: 16px; margin-right: 10px;"><i class="fas fa-trash"></i></button>
                            
                            <button onclick="verHistorico('${c.nome}')" title="Histórico" style="color:#455a64; border:none; background:none; cursor:pointer; font-size: 16px; margin-right: 10px;"><i class="fas fa-history"></i></button>
                            
                            <button onclick="alert('Situação Financeira atual: R$ ${financeiro.toFixed(2)}')" title="Financeiro" style="color:#2e7d32; border:none; background:none; cursor:pointer; font-size: 16px;"><i class="fas fa-dollar-sign"></i></button>
                        </td>
                    </tr>`;
            });
        }

        html += '</tbody></table>';
        container.innerHTML = html;
    });
}

// 3. Função de Exclusão Segura (Dois Cliques)
function confirmarExclusao(id) {
    const btn = document.getElementById(`del-${id}`);
    
    // Se já foi clicado uma vez (tem a classe 'confirmar')
    if (btn.classList.contains('confirmar')) {
        firebase.database().ref('clientes/' + id).remove()
            .then(() => alert("🗑️ Cliente removido com sucesso!"));
    } else {
        // Primeiro clique: Muda a cor e o ícone, pede confirmação
        btn.classList.add('confirmar');
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        btn.style.color = "orange";
        
        // Se o usuário não clicar de novo em 3 segundos, cancela a ação
        setTimeout(() => {
            if(btn) {
                btn.classList.remove('confirmar');
                btn.innerHTML = '<i class="fas fa-trash"></i>';
                btn.style.color = "#d32f2f";
            }
        }, 3000);
    }
}

// 4. Função para preparar o formulário para Edição
function prepararEdicao(id) {
    firebase.database().ref('clientes/' + id).once('value', (snap) => {
        const c = snap.val();
        
        // Preenche os campos com os dados do cliente
        document.getElementById('cli-id').value = id;
        document.getElementById('cli-nome').value = c.nome;
        document.getElementById('cli-tipo').value = c.tipo;
        document.getElementById('cli-status').value = c.status || 'ATIVO'; // Carrega o status
        document.getElementById('cli-cep').value = c.cep;
        document.getElementById('cli-fone').value = c.fone;
        document.getElementById('cli-endereco').value = c.endereco || "";
        document.getElementById('cli-obs').value = c.obs || ""; // Carrega a observação
        
        // Muda o visual do formulário
        document.getElementById('titulo-form-cliente').innerText = "✏️ Editando Cliente";
        document.getElementById('btn-salvar-cliente').innerText = "Atualizar Cadastro";
        document.getElementById('btn-salvar-cliente').style.background = "#1976d2"; // Fica azul na edição
        document.getElementById('btn-cancelar-edit').style.display = "block";
        
        // Rola a tela para cima para o usuário ver o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// 5. Função para limpar e resetar o formulário
function limparFormularioCliente() {
    document.getElementById('cli-id').value = "";
    document.getElementById('cli-nome').value = "";
    document.getElementById('cli-tipo').value = "";
    document.getElementById('cli-status').value = "ATIVO"; // Reseta para Ativo
    document.getElementById('cli-cep').value = "";
    document.getElementById('cli-fone').value = "";
    document.getElementById('cli-endereco').value = "";
    document.getElementById('cli-obs').value = ""; // Limpa a observação
    
    // Retorna o visual ao normal
    document.getElementById('titulo-form-cliente').innerText = "Novo Cadastro de Cliente";
    document.getElementById('btn-salvar-cliente').innerText = "Salvar Cliente";
    document.getElementById('btn-salvar-cliente').style.background = "var(--primary-color)"; // Volta pro verde
    document.getElementById('btn-cancelar-edit').style.display = "none";
}

// 6. Função para Ver Histórico de Vendas Real
function verHistorico(nomeCliente) {
    firebase.database().ref('vendas').once('value', (snap) => {
        let historico = [];
        snap.forEach(child => {
            const v = child.val();
            // Filtra as vendas que pertencem a este cliente
            if (v.cliente === nomeCliente) {
                historico.push(v);
            }
        });

        if (historico.length === 0) {
            return alert(`ℹ️ Nenhuma venda encontrada para: ${nomeCliente}`);
        }

        // Ordenar por data (mais recente primeiro)
        historico.sort((a, b) => new Date(b.data.split('/').reverse().join('-')) - new Date(a.data.split('/').reverse().join('-')));

        let mensagem = `📋 HISTÓRICO DE VENDAS: ${nomeCliente}\n\n`;
        historico.forEach(h => {
            mensagem += `📅 ${h.data} - ${h.produto}\n`;
            mensagem += `   Qtd: ${h.quantidade} | Total: R$ ${h.valor.toFixed(2)}\n`;
            mensagem += `----------------------------\n`;
        });

        alert(mensagem);
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
        if (typeof recalcularTudo === "function") recalcularTudo();
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

// FUNÇÃO PARA PESQUISAR CLIENTE (SÓ NOME)
function filtrarClientes() {
    let input = document.getElementById('inputPesquisa').value.toLowerCase();
    let tabela = document.querySelector("#lista-clientes-container table tbody");
    let linhas = tabela.getElementsByTagName('tr');

    for (let i = 0; i < linhas.length; i++) {
        let nomeCliente = linhas[i].getElementsByTagName('td')[0].innerText.toLowerCase();
        if (nomeCliente.includes(input)) {
            linhas[i].style.display = "";
        } else {
            linhas[i].style.display = "none";
        }
    }
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

// Função para Gerar PDF / Imprimir Lista de Clientes
function imprimirClientes() {
    const conteudo = document.getElementById('lista-clientes-container').innerHTML;
    const janelaImpressao = window.open('', '', 'width=900,height=700');
    janelaImpressao.document.write(`
        <html>
            <head>
                <title>HortiNutri+ - Relatório de Clientes</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    h2 { color: #2e7d32; text-align: center; }
                    td:last-child, th:last-child { display: none; }
                </style>
            </head>
            <body>
                <h2>Relatório de Clientes - HortiNutri+</h2>
                <p>Data de emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
                ${conteudo}
            </body>
        </html>
    `);
    janelaImpressao.document.close();
    janelaImpressao.print();
}
