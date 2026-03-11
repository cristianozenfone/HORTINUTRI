let meuGrafico = null;

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
    
    document.getElementById('tab-' + tabId).style.display = 'block';
    document.getElementById('current-tab-title').innerText = tabId.toUpperCase().replace('-', ' ');

    if (tabId === 'dashboard') atualizarGrafico();
    if (tabId === 'insumos') listarInsumos();
    if (tabId === 'mix-kits') listarProdutos();
    if (tabId === 'ficha-tecnica') carregarDadosFicha();
    if (tabId === 'producao-insumos') listarPrecosCusto();
    if (tabId === 'vendas') carregarDadosVenda();
    if (tabId === 'financeiro') listarFinanceiro();
}

// --- INSUMOS ---
function salvarInsumo() {
    const nome = document.getElementById('ins-nome').value;
    const fc = parseFloat(document.getElementById('ins-fc').value) || 1.0;
    if(!nome) return alert("Nome obrigatório");
    firebase.database().ref('insumos').push({ nome, fc, custo: 0 }).then(() => listarInsumos());
}

function listarInsumos() {
    const tbody = document.getElementById('lista-insumos-body');
    firebase.database().ref('insumos').on('value', snap => {
        tbody.innerHTML = "";
        snap.forEach(c => {
            const i = c.val();
            tbody.innerHTML += `<tr>
                <td>${i.nome}</td><td>${i.fc}</td><td>R$ ${i.custo.toFixed(2)}</td>
                <td><button class="btn-del" onclick="deletar('insumos','${c.key}')">Remover</button></td>
            </tr>`;
        });
    });
}

// --- FICHA TÉCNICA ---
function carregarDadosFicha() {
    const sProd = document.getElementById('ft-produto');
    const sIns = document.getElementById('ft-insumo-item');
    sProd.innerHTML = "<option>Selecione o Kit</option>";
    sIns.innerHTML = "<option>Selecione o Insumo</option>";

    firebase.database().ref('produtos').once('value', snap => snap.forEach(c => {
        let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; sProd.appendChild(o);
    }));
    firebase.database().ref('insumos').once('value', snap => snap.forEach(c => {
        let o = document.createElement('option'); o.value=c.key; o.text=c.val().nome; sIns.appendChild(o);
    }));
}

function adicionarItemFicha() {
    const pId = document.getElementById('ft-produto').value;
    const iId = document.getElementById('ft-insumo-item').value;
    const q = parseFloat(document.getElementById('ft-qtd').value);
    
    firebase.database().ref('insumos/'+iId).once('value', snap => {
        const ins = snap.val();
        const subtotal = ins.custo * q * ins.fc;
        firebase.database().ref('fichas/'+pId).push({ nome: ins.nome, q, subtotal }).then(() => listarItensFicha(pId));
    });
}

function listarItensFicha(pId) {
    const tbody = document.getElementById('lista-itens-ficha-body');
    firebase.database().ref('fichas/'+pId).on('value', snap => {
        tbody.innerHTML = "";
        snap.forEach(c => {
            tbody.innerHTML += `<tr><td>${c.val().nome}</td><td>${c.val().q}</td><td>R$ ${c.val().subtotal.toFixed(2)}</td><td><button class="btn-del">X</button></td></tr>`;
        });
    });
}

// --- GESTÃO DE CUSTOS ---
function listarPrecosCusto() {
    const div = document.getElementById('lista-precos-insumos-grid');
    firebase.database().ref('insumos').on('value', snap => {
        div.innerHTML = "";
        snap.forEach(c => {
            div.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee">
                <span>${c.val().nome}</span>
                <input type="number" style="width:100px; margin:0" id="custo-${c.key}" value="${c.val().custo}">
                <button style="width:60px; margin:0" onclick="salvarNovoCusto('${c.key}')">OK</button>
            </div>`;
        });
    });
}

function salvarNovoCusto(id) {
    const novoPreco = parseFloat(document.getElementById('custo-'+id).value);
    firebase.database().ref('insumos/'+id).update({ custo: novoPreco }).then(() => alert("Custo Atualizado!"));
}

// --- FINANCEIRO ---
function salvarDespesa() {
    const desc = document.getElementById('fin-desc').value;
    const valor = parseFloat(document.getElementById('fin-valor').value);
    firebase.database().ref('financeiro').push({ desc, valor, data: new Date().toLocaleDateString() });
}

function listarFinanceiro() {
    const tbody = document.getElementById('lista-financeiro-body');
    firebase.database().ref('financeiro').on('value', snap => {
        tbody.innerHTML = "";
        snap.forEach(c => {
            tbody.innerHTML += `<tr><td>${c.val().data}</td><td>${c.val().desc}</td><td>R$ ${c.val().valor.toFixed(2)}</td></tr>`;
        });
    });
}

function deletar(pasta, id) { if(confirm("Deseja excluir?")) firebase.database().ref(pasta+'/'+id).remove(); }

window.onload = () => showTab('dashboard');
