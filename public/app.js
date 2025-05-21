let token = '';

function setAuthUI(loggedIn) {
  document.getElementById('todoSection').style.display = loggedIn ? '' : 'none';
  document.getElementById('logoutBtn').style.display = loggedIn ? '' : 'none';
  document.getElementById('username').style.display = loggedIn ? 'none' : '';
  document.getElementById('password').style.display = loggedIn ? 'none' : '';
  document.querySelectorAll('#auth button')[0].style.display = loggedIn ? 'none' : '';
  document.querySelectorAll('#auth button')[1].style.display = loggedIn ? 'none' : '';
}

function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        document.getElementById('authStatus').textContent = 'Registered! Please login.';
      } else {
        document.getElementById('authStatus').textContent = data.error;
      }
    });
}

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(r => r.json())
    .then(data => {
      if (data.token) {
        token = data.token;
        setAuthUI(true);
        fetchTodos();
        document.getElementById('authStatus').textContent = '';
      } else {
        document.getElementById('authStatus').textContent = data.error;
      }
    });
}

function logout() {
  fetch('/api/logout', {
    method: 'POST',
    headers: { 'x-auth-token': token }
  }).then(() => {
    token = '';
    setAuthUI(false);
    document.getElementById('todos').innerHTML = '';
  });
}

function addTodo(e) {
  e.preventDefault();
  const text = document.getElementById('todoText').value;
  const dueDate = document.getElementById('dueDate').value;
  const priority = document.getElementById('priority').value;
  const tags = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean);
  fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
    body: JSON.stringify({ text, dueDate, priority, tags })
  })
    .then(r => r.json())
    .then(() => {
      document.getElementById('todoForm').reset();
      fetchTodos();
    });
}

function fetchTodos() {
  const search = document.getElementById('search').value;
  let url = '/api/todos';
  if (search) url += `?search=${encodeURIComponent(search)}`;
  fetch(url, {
    headers: { 'x-auth-token': token }
  })
    .then(r => r.json())
    .then(todos => {
      const todosDiv = document.getElementById('todos');
      todosDiv.innerHTML = '';
      todos.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'todo' + (todo.completed ? ' completed' : '');
        div.innerHTML = `
          <div><b>${todo.text}</b></div>
          <div class="meta">
            Due: ${todo.dueDate || 'N/A'} | Priority: ${todo.priority || 'N/A'}
          </div>
          <div class="tags">${(todo.tags||[]).map(tag => `<span class='tag'>${tag}</span>`).join('')}</div>
          <button onclick="toggleComplete('${todo.id}', ${!todo.completed})">${todo.completed ? 'Mark Incomplete' : 'Mark Complete'}</button>
          <button onclick="deleteTodo('${todo.id}')">Delete</button>
        `;
        todosDiv.appendChild(div);
      });
    });
}

function toggleComplete(id, completed) {
  fetch(`/api/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
    body: JSON.stringify({ completed })
  }).then(fetchTodos);
}

function deleteTodo(id) {
  fetch(`/api/todos/${id}`, {
    method: 'DELETE',
    headers: { 'x-auth-token': token }
  }).then(fetchTodos);
}

setAuthUI(false);
