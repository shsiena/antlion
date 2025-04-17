const express = require('express');
const { robotsGuard } = require('../dist/index.js'); // Adjust the path to where your package is located

const app = express();

app.get('/users', (req, res) => {
  res.send('Users page');
});

app.get('/users/:id', (req, res) => {
  res.send(`User with ID ${req.params.id}`);
});

app.get('/products', (req, res) => {
  res.send('Products page');
});

app.get('/products/:id', (req, res) => {
  res.send(`Product with ID ${req.params.id}`);
});

robotsGuard(app, {
  disallow: ['/products/:id'],
  allowRoot: true
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

