const express = require('express');
const app = express();
app.use(express.json());

// ========== BANCO DE DADOS EM MEMÓRIA ==========
let filmes = [];
let usuarios = [];
let favoritos = [];

// Contadores para IDs únicos
let proximoIdFilme = 1;
let proximoIdUsuario = 1;
let proximoIdFavorito = 1;

// ========== FUNÇÕES AUXILIARES ==========
const encontrarIndex = (array, id) => array.findIndex(item => item.id === parseInt(id));

const respostaPadrao = (res, status, mensagem, dados = null) => {
    const resposta = { sucesso: status < 400, mensagem };
    return dados ? res.status(status).json({ ...resposta, dados }) : res.status(status).json(resposta);
};

// ========== GESTÃO DE FILMES ==========

// GET - Listar todos os filmes
app.get('/filmes', (req, res) => respostaPadrao(res, 200, 'Lista de filmes recuperada com sucesso', filmes));

// GET - Buscar filme por ID
app.get('/filmes/:id', (req, res) => {
    const filme = filmes.find(f => f.id === parseInt(req.params.id));
    return filme
        ? respostaPadrao(res, 200, 'Filme encontrado', filme)
        : respostaPadrao(res, 404, 'Filme não encontrado');
});

// POST - Cadastrar novo filme
app.post('/filmes', (req, res) => {
    const { titulo, diretor, ano, genero, duracao } = req.body;
    const novoFilme = {
        id: proximoIdFilme++,
        titulo: titulo || 'Sem título',
        diretor: diretor || 'Não informado',
        ano: ano || new Date().getFullYear(),
        genero: genero || 'Não classificado',
        duracao: duracao || 0,
        data_cadastro: new Date().toISOString()
    };
    filmes.push(novoFilme);
    return respostaPadrao(res, 201, 'Filme cadastrado com sucesso', novoFilme);
});

// PUT - Atualizar filme completo
app.put('/filmes/:id', (req, res) => {
    const index = encontrarIndex(filmes, req.params.id);
    return index === -1
        ? respostaPadrao(res, 404, 'Filme não encontrado para atualização')
        : (() => {
            const { titulo, diretor, ano, genero, duracao } = req.body;
            filmes[index] = {
                ...filmes[index],
                titulo: titulo || filmes[index].titulo,
                diretor: diretor || filmes[index].diretor,
                ano: ano || filmes[index].ano,
                genero: genero || filmes[index].genero,
                duracao: duracao || filmes[index].duracao,
                data_atualizacao: new Date().toISOString()
            };
            return respostaPadrao(res, 200, 'Filme atualizado com sucesso', filmes[index]);
        })();
});

// DELETE - Remover filme
app.delete('/filmes/:id', (req, res) => {
    const index = encontrarIndex(filmes, req.params.id);
    return index === -1
        ? respostaPadrao(res, 404, 'Filme não encontrado para exclusão')
        : (() => {
            const filmeRemovido = filmes.splice(index, 1)[0];
            favoritos = favoritos.filter(fav => fav.filme_id !== filmeRemovido.id);
            return respostaPadrao(res, 200, 'Filme removido com sucesso', filmeRemovido);
        })();
});

// ========== GESTÃO DE USUÁRIOS ==========

// GET - Listar todos os usuários
app.get('/usuarios', (req, res) => respostaPadrao(res, 200, 'Lista de usuários recuperada com sucesso', usuarios));

// GET - Buscar usuário por ID
app.get('/usuarios/:id', (req, res) => {
    const usuario = usuarios.find(u => u.id === parseInt(req.params.id));
    return usuario
        ? respostaPadrao(res, 200, 'Usuário encontrado', usuario)
        : respostaPadrao(res, 404, 'Usuário não encontrado');
});

// POST - Cadastrar novo usuário
app.post('/usuarios', (req, res) => {
    const { nome, email, senha, data_nascimento } = req.body;
    const novoUsuario = {
        id: proximoIdUsuario++,
        nome: nome || 'Usuário sem nome',
        email: email || 'email@naoinformado.com',
        senha: senha || 'senha123',
        data_nascimento: data_nascimento || null,
        data_cadastro: new Date().toISOString(),
        ativo: true
    };
    usuarios.push(novoUsuario);
    return respostaPadrao(res, 201, 'Usuário cadastrado com sucesso', novoUsuario);
});

// PUT - Atualizar usuário completo
app.put('/usuarios/:id', (req, res) => {
    const index = encontrarIndex(usuarios, req.params.id);
    return index === -1
        ? respostaPadrao(res, 404, 'Usuário não encontrado para atualização')
        : (() => {
            const { nome, email, senha, data_nascimento, ativo } = req.body;
            usuarios[index] = {
                ...usuarios[index],
                nome: nome || usuarios[index].nome,
                email: email || usuarios[index].email,
                senha: senha || usuarios[index].senha,
                data_nascimento: data_nascimento || usuarios[index].data_nascimento,
                ativo: ativo !== undefined ? ativo : usuarios[index].ativo,
                data_atualizacao: new Date().toISOString()
            };
            return respostaPadrao(res, 200, 'Usuário atualizado com sucesso', usuarios[index]);
        })();
});

// DELETE - Remover usuário
app.delete('/usuarios/:id', (req, res) => {
    const index = encontrarIndex(usuarios, req.params.id);
    return index === -1
        ? respostaPadrao(res, 404, 'Usuário não encontrado para exclusão')
        : (() => {
            const usuarioRemovido = usuarios.splice(index, 1)[0];
            favoritos = favoritos.filter(fav => fav.usuario_id !== usuarioRemovido.id);
            return respostaPadrao(res, 200, 'Usuário removido com sucesso', usuarioRemovido);
        })();
});

// ========== SISTEMA DE FAVORITOS ==========

// GET - Listar todos os favoritos
app.get('/favoritos', (req, res) => respostaPadrao(res, 200, 'Lista de favoritos recuperada com sucesso', favoritos));

// GET - Listar favoritos de um usuário específico
app.get('/usuarios/:id/favoritos', (req, res) => {
    const usuarioId = parseInt(req.params.id);
    const usuarioExiste = usuarios.some(u => u.id === usuarioId);
    return usuarioExiste
        ? (() => {
            const favoritosUsuario = favoritos
                .filter(fav => fav.usuario_id === usuarioId)
                .map(fav => {
                    const filme = filmes.find(f => f.id === fav.filme_id);
                    return { ...fav, detalhes_filme: filme || null };
                });
            return respostaPadrao(res, 200, 'Favoritos do usuário recuperados', favoritosUsuario);
        })()
        : respostaPadrao(res, 404, 'Usuário não encontrado');
});

// GET - Buscar favorito por ID
app.get('/favoritos/:id', (req, res) => {
    const favorito = favoritos.find(f => f.id === parseInt(req.params.id));
    return favorito
        ? respostaPadrao(res, 200, 'Favorito encontrado', favorito)
        : respostaPadrao(res, 404, 'Favorito não encontrado');
});

// POST - Adicionar filme aos favoritos
app.post('/favoritos', (req, res) => {
    const { usuario_id, filme_id } = req.body;
    const usuarioExiste = usuarios.some(u => u.id === parseInt(usuario_id));
    const filmeExiste = filmes.some(f => f.id === parseInt(filme_id));
    const jaFavoritado = favoritos.some(f => f.usuario_id === parseInt(usuario_id) && f.filme_id === parseInt(filme_id));
   
    return (!usuarioExiste || !filmeExiste)
        ? respostaPadrao(res, 404, !usuarioExiste ? 'Usuário não encontrado' : 'Filme não encontrado')
        : jaFavoritado
            ? respostaPadrao(res, 400, 'Filme já está nos favoritos do usuário')
            : (() => {
                const novoFavorito = {
                    id: proximoIdFavorito++,
                    usuario_id: parseInt(usuario_id),
                    filme_id: parseInt(filme_id),
                    data_favorito: new Date().toISOString()
                };
                favoritos.push(novoFavorito);
                return respostaPadrao(res, 201, 'Filme adicionado aos favoritos', novoFavorito);
            })();
});

// PUT - Atualizar favorito (mudar filme)
app.put('/favoritos/:id', (req, res) => {
    const index = encontrarIndex(favoritos, req.params.id);
    return index === -1
        ? respostaPadrao(res, 404, 'Favorito não encontrado para atualização')
        : (() => {
            const { usuario_id, filme_id } = req.body;
            const usuarioExiste = usuarios.some(u => u.id === parseInt(usuario_id || favoritos[index].usuario_id));
            const filmeExiste = filmes.some(f => f.id === parseInt(filme_id || favoritos[index].filme_id));
           
            return (!usuarioExiste || !filmeExiste)
                ? respostaPadrao(res, 404, !usuarioExiste ? 'Usuário não encontrado' : 'Filme não encontrado')
                : (() => {
                    favoritos[index] = {
                        ...favoritos[index],
                        usuario_id: usuario_id ? parseInt(usuario_id) : favoritos[index].usuario_id,
                        filme_id: filme_id ? parseInt(filme_id) : favoritos[index].filme_id,
                        data_atualizacao: new Date().toISOString()
                    };
                    return respostaPadrao(res, 200, 'Favorito atualizado com sucesso', favoritos[index]);
                })();
        })();
});

// DELETE - Remover favorito
app.delete('/favoritos/:id', (req, res) => {
    const index = encontrarIndex(favoritos, req.params.id);
    return index === -1
        ? respostaPadrao(res, 404, 'Favorito não encontrado para exclusão')
        : (() => {
            const favoritoRemovido = favoritos.splice(index, 1)[0];
            return respostaPadrao(res, 200, 'Favorito removido com sucesso', favoritoRemovido);
        })();
});

// DELETE - Remover todos os favoritos de um usuário
app.delete('/usuarios/:id/favoritos', (req, res) => {
    const usuarioId = parseInt(req.params.id);
    const usuarioExiste = usuarios.some(u => u.id === usuarioId);
    return usuarioExiste
        ? (() => {
            const favoritosRemovidos = favoritos.filter(fav => fav.usuario_id === usuarioId);
            favoritos = favoritos.filter(fav => fav.usuario_id !== usuarioId);
            return respostaPadrao(res, 200, 'Todos os favoritos do usuário foram removidos', favoritosRemovidos);
        })()
        : respostaPadrao(res, 404, 'Usuário não encontrado');
});

// ========== INICIALIZAÇÃO DO SERVIDOR ==========
const PORTA = 3000;
app.listen(PORTA, () => {
    console.log(`🎬 CineStream API rodando na porta ${PORTA}`);
    console.log(`📁 Filmes: http://localhost:${PORTA}/filmes`);
    console.log(`👥 Usuários: http://localhost:${PORTA}/usuarios`);
    console.log(`⭐ Favoritos: http://localhost:${PORTA}/favoritos`);
});