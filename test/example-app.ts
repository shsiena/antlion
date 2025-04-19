import express from 'express';
import antlion from '../src/index';

const app = express();
const port = 3000;

// Set up robots middleware at the beginning
antlion(app, {
    robotsPath: 'robots.txt',
    trappedRoutes: ['/evil/', '/trap/', '/tarpit/testing/'],
    trainingDataPath: 'training-data.txt'
});

// Define routes with various HTTP methods
app.get('/', (req, res) => {
    res.send('Hello Home!');
});

app.get('/blog', (req, res) => {
    res.send('Blog page');
});

app.post('/blog', (req, res) => {
    res.send('Create blog post');
});

app.get('/blog/:id', (req, res) => {
    res.send(`Blog post ${req.params.id}`);
});

app.put('/blog/:id', (req, res) => {
    res.send(`Update blog post ${req.params.id}`);
});

app.get('/testing', (req, res) => {
    res.status(200).send('ligma');
})

app.delete('/blog/:id', (req, res) => {
    res.send(`Delete blog post ${req.params.id}`);
});

app.get('/admin', (req, res) => {
    res.send('Admin panel');
});

app.post('/admin/login', (req, res) => {
    res.send('Admin login');
});

// Using app.all() for a route that handles all methods
app.all('/api/echo', (req, res) => {
    res.json({ method: req.method, path: req.path });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
