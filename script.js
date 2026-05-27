// Configuração da API
const API_URL = 'http://localhost:3000&#39;;

// Estado da aplicação
let currentUser = null;
let currentMovieId = null;

// Elementos DOM
const userSelect = document.getElementById('userSelect');
const searchInput = document.getElementById('searchInput');
const genreFilter = document.getElementById('genreFilter');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadMovies();
    loadStats();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;
            navigateTo(section);
        });
    });

    // Usuário
    userSelect.addEventListener('change', handleUserChange);
    document.getElementById('newUserBtn').addEventListener('click', showNewUserForm);

    // Busca e filtros
    searchInput.addEventListener('input', debounce(filterMovies, 300));
    genreFilter.addEventListener('change', filterMovies);

    // Botões
    document.getElementById('addMovieBtn').addEventListener('click', () => showMovieForm());

    // Modal
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeAllModals);
    });

    // Formulário de filme
    document.getElementById('movieForm').addEventListener('submit', handleMovieSubmit);

    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// Navegação
function navigateTo(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
   
    document.getElementById(`${section}-section`).classList.add('active');
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    if (section === 'favoritos') {
        loadUserFavorites();
    } else if (section === 'catalogo') {
        loadMovies();
    }
}

// Carregar Usuários
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/usuarios`);
        const data = await response.json();
       
        userSelect.innerHTML = '<option value="">Selecionar Usuário</option>';
       
        if (data.sucesso && data.dados) {
            data.dados.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.nome;
                userSelect.appendChild(option);
            });
        }
    } catch (error) {
        showToast('Erro ao carregar usuários', 'error');
    }
}

// Carregar Filmes
async function loadMovies() {
    try {
        const response = await fetch(`${API_URL}/filmes`);
        const data = await response.json();
       
        if (data.sucesso && data.dados) {
            displayMovies(data.dados, 'allMovies');
            displayFeaturedMovies(data.dados.slice(0, 4));
        }
    } catch (error) {
        showToast('Erro ao carregar filmes', 'error');
    }
}

// Exibir Filmes em Destaque
function displayFeaturedMovies(movies) {
    const container = document.getElementById('featuredMovies');
    container.innerHTML = '';
   
    movies.forEach(movie => {
        container.appendChild(createMovieCard(movie));
    });
}

// Exibir Filmes no Grid
function displayMovies(movies, containerId) {
    const container = document.getElementById(containerId);
    const noResults = document.getElementById('noResults');
    container.innerHTML = '';
   
    if (movies.length === 0) {
        if (noResults) noResults.style.display = 'block';
        return;
    }
   
    if (noResults) noResults.style.display = 'none';
   
    movies.forEach(movie => {
        container.appendChild(createMovieCard(movie));
    });
}

// Criar Card de Filme
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => showMovieDetails(movie.id);
   
    card.innerHTML = `
        <div class="movie-poster">🎬</div>
        <div class="movie-info">
            <h3 class="movie-title">${movie.titulo}</h3>
            <div class="movie-meta">
                <span>${movie.ano || 'N/A'}</span>
                <span>${movie.duracao || 0} min</span>
            </div>
            <span class="movie-genre-tag">${movie.genero || 'Não classificado'}</span>
            <p style="margin-top: 0.5rem; color: #636E72;">${movie.diretor || 'Diretor não informado'}</p>
            <div class="movie-actions" onclick="event.stopPropagation()">
                <button class="btn btn-favorite" onclick="toggleFavorite(${movie.id}, this)">
                    ${isFavorite(movie.id) ? '❤️' : '🤍'}
                </button>
            </div>
        </div>
    `;
   
    return card;
}

// Verificar se filme é favorito
function isFavorite(movieId) {
    if (!currentUser) return false;
    // Aqui você pode implementar uma verificação mais precisa
    return false;
}

// Mostrar Detalhes do Filme
async function showMovieDetails(movieId) {
    try {
        const response = await fetch(`${API_URL}/filmes/${movieId}`);
        const data = await response.json();
       
        if (data.sucesso && data.dados) {
            const movie = data.dados;
            currentMovieId = movie.id;
           
            document.getElementById('modalTitle').textContent = movie.titulo;
            document.getElementById('modalGenre').textContent = movie.genero || 'Não classificado';
            document.getElementById('modalDirector').textContent = movie.diretor || 'Não informado';
            document.getElementById('modalYear').textContent = movie.ano || 'N/A';
            document.getElementById('modalDuration').textContent = movie.duracao || 0;
            document.getElementById('modalDate').textContent = new Date(movie.data_cadastro).toLocaleDateString('pt-BR');
           
            document.getElementById('modalEditBtn').onclick = () => {
                closeModal('movieModal');
                showMovieForm(movie);
            };
           
            document.getElementById('modalDeleteBtn').onclick = () => deleteMovie(movie.id);
            document.getElementById('modalFavoriteBtn').onclick = () => toggleFavoriteFromModal(movie.id);
           
            updateFavoriteButton(movie.id);
           
            document.getElementById('movieModal').style.display = 'block';
        }
    } catch (error) {
        showToast('Erro ao carregar detalhes do filme', 'error');
    }
}

// Alternar Favorito do Modal
async function toggleFavoriteFromModal(movieId) {
    if (!currentUser) {
        showToast('Selecione um usuário primeiro!', 'error');
        return;
    }
   
    try {
        // Verificar se já é favorito
        const favResponse = await fetch(`${API_URL}/usuarios/${currentUser}/favoritos`);
        const favData = await favResponse.json();
       
        const existingFav = favData.dados?.find(f => f.filme_id === movieId);
       
        if (existingFav) {
            // Remover favorito
            await fetch(`${API_URL}/favoritos/${existingFav.id}`, {
                method: 'DELETE'
            });
            showToast('Removido dos favoritos!', 'success');
        } else {
            // Adicionar favorito
            await fetch(`${API_URL}/favoritos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id: currentUser,
                    filme_id: movieId
                })
            });
            showToast('Adicionado aos favoritos! ⭐', 'success');
        }
       
        updateFavoriteButton(movieId);
        loadStats();
    } catch (error) {
        showToast('Erro ao atualizar favorito', 'error');
    }
}

// Atualizar Botão de Favorito
async function updateFavoriteButton(movieId) {
    const btn = document.getElementById('modalFavoriteBtn');
    const icon = btn.querySelector('.favorite-icon');
    const text = document.getElementById('modalFavoriteText');
   
    if (!currentUser) {
        btn.disabled = true;
        text.textContent = 'Selecione um usuário';
        return;
    }
   
    btn.disabled = false;
   
    try {
        const response = await fetch(`${API_URL}/usuarios/${currentUser}/favoritos`);
        const data = await response.json();
       
        const isFav = data.dados?.some(f => f.filme_id === movieId);
       
        if (isFav) {
            btn.classList.add('active');
            icon.textContent = '❤️';
            text.textContent = 'Remover dos Favoritos';
        } else {
            btn.classList.remove('active');
            icon.textContent = '🤍';
            text.textContent = 'Adicionar aos Favoritos';
        }
    } catch (error) {
        console.error('Erro ao verificar favorito:', error);
    }
}

// Alternar Favorito do Card
async function toggleFavorite(movieId, button) {
    if (!currentUser) {
        showToast('Selecione um usuário primeiro!', 'error');
        return;
    }
   
    try {
        const favResponse = await fetch(`${API_URL}/usuarios/${currentUser}/favoritos`);
        const favData = await favResponse.json();
       
        const existingFav = favData.dados?.find(f => f.filme_id === movieId);
       
        if (existingFav) {
            await fetch(`${API_URL}/favoritos/${existingFav.id}`, {
                method: 'DELETE'
            });
            button.innerHTML = '🤍';
            showToast('Removido dos favoritos!', 'success');
        } else {
            await fetch(`${API_URL}/favoritos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id: currentUser,
                    filme_id: movieId
                })
            });
            button.innerHTML = '❤️';
            showToast('Adicionado aos favoritos! ⭐', 'success');
        }
       
        loadStats();
    } catch (error) {
        showToast('Erro ao atualizar favorito', 'error');
    }
}

// Carregar Favoritos do Usuário
async function loadUserFavorites() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    const noFavorites = document.getElementById('noFavorites');
    const userInfo = document.getElementById('favoritesUserInfo');
   
    if (!currentUser) {
        userInfo.textContent = 'Selecione um usuário para ver seus favoritos';
        favoritesGrid.innerHTML = '';
        noFavorites.style.display = 'block';
        return;
    }
   
    try {
        const response = await fetch(`${API_URL}/usuarios/${currentUser}/favoritos`);
        const data = await response.json();
       
        userInfo.textContent = `Favoritos de ${userSelect.options[userSelect.selectedIndex].text}`;
       
        if (data.sucesso && data.dados && data.dados.length > 0) {
            noFavorites.style.display = 'none';
            favoritesGrid.innerHTML = '';
           
            data.dados.forEach(fav => {
                if (fav.detalhes_filme) {
                    const card = createMovieCard(fav.detalhes_filme);
                    card.querySelector('.movie-actions .btn-favorite').innerHTML = '❤️';
                    favoritesGrid.appendChild(card);
                }
            });
        } else {
            favoritesGrid.innerHTML = '';
            noFavorites.style.display = 'block';
        }
    } catch (error) {
        showToast('Erro ao carregar favoritos', 'error');
    }
}

// Mostrar Formulário de Filme
function showMovieForm(movie = null) {
    const modal = document.getElementById('formModal');
    const formTitle = document.getElementById('formTitle');
    const form = document.getElementById('movieForm');
   
    form.reset();
    document.getElementById('movieId').value = '';
   
    if (movie) {
        formTitle.textContent = 'Editar Filme';
        document.getElementById('movieId').value = movie.id;
        document.getElementById('titulo').value = movie.titulo;
        document.getElementById('diretor').value = movie.diretor || '';
        document.getElementById('ano').value = movie.ano || '';
        document.getElementById('duracao').value = movie.duracao || '';
        document.getElementById('genero').value = movie.genero || '';
    } else {
        formTitle.textContent = 'Novo Filme';
    }
   
    modal.style.display = 'block';
}

// Manipular Submissão do Formulário
async function handleMovieSubmit(e) {
    e.preventDefault();
   
    const movieId = document.getElementById('movieId').value;
    const movieData = {
        titulo: document.getElementById('titulo').value,
        diretor: document.getElementById('diretor').value,
        ano: parseInt(document.getElementById('ano').value) || new Date().getFullYear(),
        genero: document.getElementById('genero').value,
        duracao: parseInt(document.getElementById('duracao').value) || 0
    };
   
    try {
        const url = movieId ? `${API_URL}/filmes/${movieId}` : `${API_URL}/filmes`;
        const method = movieId ? 'PUT' : 'POST';
       
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movieData)
        });
       
        const data = await response.json();
       
        if (data.sucesso) {
            showToast(movieId ? 'Filme atualizado com sucesso!' : 'Filme cadastrado com sucesso!', 'success');
            closeFormModal();
            loadMovies();
            loadStats();
        } else {
            showToast(data.mensagem || 'Erro ao salvar filme', 'error');
        }
    } catch (error) {
        showToast('Erro ao salvar filme', 'error');
    }
}

// Deletar Filme
async function deleteMovie(movieId) {
    if (!confirm('Tem certeza que deseja excluir este filme?')) return;
   
    try {
        const response = await fetch(`${API_URL}/filmes/${movieId}`, {
            method: 'DELETE'
        });
       
        const data = await response.json();
       
        if (data.sucesso) {
            showToast('Filme excluído com sucesso!', 'success');
            closeAllModals();
            loadMovies();
            loadStats();
        }
    } catch (error) {
        showToast('Erro ao excluir filme', 'error');
    }
}

// Mostrar Formulário de Novo Usuário
function showNewUserForm() {
    const nome = prompt('Nome do novo usuário:');
    if (!nome) return;
   
    const email = prompt('Email:');
    const senha = prompt('Senha:');
   
    createUser(nome, email, senha);
}

// Criar Usuário
async function createUser(nome, email, senha) {
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
       
        const data = await response.json();
       
        if (data.sucesso) {
            showToast('Usuário criado com sucesso!', 'success');
            loadUsers();
            loadStats();
           
            // Selecionar automaticamente o novo usuário
            setTimeout(() => {
                userSelect.value = data.dados.id;
                handleUserChange();
            }, 500);
        }
    } catch (error) {
        showToast('Erro ao criar usuário', 'error');
    }
}

// Manipular Mudança de Usuário
function handleUserChange() {
    currentUser = userSelect.value ? parseInt(userSelect.value) : null;
    loadUserFavorites();
    loadStats();
}

// Carregar Estatísticas
async function loadStats() {
    try {
        const [moviesRes, usersRes, favRes] = await Promise.all([
            fetch(`${API_URL}/filmes`),
            fetch(`${API_URL}/usuarios`),
            fetch(`${API_URL}/favoritos`)
        ]);
       
        const movies = await moviesRes.json();
        const users = await usersRes.json();
        const favorites = await favRes.json();
       
        document.getElementById('totalMovies').textContent = movies.dados?.length || 0;
        document.getElementById('totalUsers').textContent = users.dados?.length || 0;
        document.getElementById('totalFavorites').textContent = favorites.dados?.length || 0;
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Filtrar Filmes
async function filterMovies() {
    const searchTerm = searchInput.value.toLowerCase();
    const genre = genreFilter.value;
   
    try {
        const response = await fetch(`${API_URL}/filmes`);
        const data = await response.json();
       
        if (data.sucesso && data.dados) {
            let filtered = data.dados;
           
            if (searchTerm) {
                filtered = filtered.filter(movie =>
                    movie.titulo.toLowerCase().includes(searchTerm) ||
                    (movie.diretor && movie.diretor.toLowerCase().includes(searchTerm)) ||
                    (movie.genero && movie.genero.toLowerCase().includes(searchTerm))
                );
            }
           
            if (genre) {
                filtered = filtered.filter(movie => movie.genero === genre);
            }
           
            displayMovies(filtered, 'allMovies');
        }
    } catch (error) {
        showToast('Erro ao filtrar filmes', 'error');
    }
}

// Fechar Modais
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function closeFormModal() {
    closeModal('formModal');
}

// Toast Notification
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
   
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✅' : '❌'}</span>
        <span>${message}</span>
    `;
   
    document.body.appendChild(toast);
   
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Debounce Utility
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}