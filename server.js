const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Use lowdb v1 for persistent JSON storage (CommonJS compatible)
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const app = express();
const PORT = process.env.PORT || 3000;

// Setup lowdb
const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);
db.defaults({ users: [], todos: [], sessions: {} }).write();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Authentication middleware
function auth(req, res, next) {
  const token = req.headers['x-auth-token'];
  const sessions = db.get('sessions').value();
  if (!token || !(token in sessions)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = sessions[token];
  next();
}

// User registration
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  if (db.get('users').find({ username }).value()) {
    return res.status(400).json({ error: 'User already exists' });
  }

  db.get('users').push({ username, password }).write();
  res.json({ success: true });
});

// User login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.get('users').find({ username, password }).value();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = Math.random().toString(36).substr(2);
  db.get('sessions').set(token, username).write();

  res.json({ token });
});

// User logout
app.post('/api/logout', auth, (req, res) => {
  const token = req.headers['x-auth-token'];
  db.get('sessions').unset(token).write();
  res.json({ success: true });
});

// Get todos
app.get('/api/todos', auth, (req, res) => {
  const { search, tag, priority } = req.query;
  let todos = db.get('todos').filter({ username: req.user }).value();

  if (search) {
    todos = todos.filter(t => t.text.toLowerCase().includes(search.toLowerCase()));
  }
  if (tag) {
    todos = todos.filter(t => t.tags && t.tags.includes(tag));
  }
  if (priority) {
    todos = todos.filter(t => t.priority === priority);
  }

  res.json(todos);
});

// Create todo
app.post('/api/todos', auth, (req, res) => {
  const { text, dueDate, priority, tags } = req.body;
  if (!text) return res.status(400).json({ error: 'Todo text is required' });

  const todo = {
    id: Math.random().toString(36).substr(2),
    username: req.user,
    text,
    dueDate: dueDate || null,
    priority: priority || 'normal',
    tags: tags || [],
    createdAt: new Date().toISOString(),
    completed: false,
  };

  db.get('todos').push(todo).write();
  res.json(todo);
});

// Update todo
app.put('/api/todos/:id', auth, (req, res) => {
  const todo = db.get('todos').find({ id: req.params.id, username: req.user }).value();
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  db.get('todos').find({ id: req.params.id, username: req.user }).assign(req.body).write();
  const updatedTodo = db.get('todos').find({ id: req.params.id, username: req.user }).value();
  res.json(updatedTodo);
});

// Delete todo
app.delete('/api/todos/:id', auth, (req, res) => {
  const todo = db.get('todos').find({ id: req.params.id, username: req.user }).value();
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  db.get('todos').remove({ id: req.params.id, username: req.user }).write();
  res.json({ success: true });
});

// Serve frontend for non-API requests
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
