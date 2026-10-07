const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const net = require('net');
const app = express();
const port = 80;

app.use(express.json());

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error(err.message);
    db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
    db.run('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
});

const formatResponse = (data) => ({ statusCode: 200, data });

app.get('/users', (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => res.json(formatResponse(rows)));
});

app.post('/users', (req, res) => {
    if (!req.body.name) return res.status(400).json({ statusCode: 400, error: "Falta el nombre" });
    db.run('INSERT INTO users (name) VALUES (?)', [req.body.name], function(err) {
        res.json(formatResponse({ id: this.lastID, name: req.body.name }));
    });
});

app.put('/users/:id', (req, res) => {
    if (!req.body.name) return res.status(400).json({ statusCode: 400, error: "Falta el nombre" });
    db.run('UPDATE users SET name = ? WHERE id = ?', [req.body.name, req.params.id], function(err) {
        if (this.changes === 0) return res.status(404).json({ statusCode: 404, error: "Usuario no encontrado" });
        res.json(formatResponse({ updated: this.changes, id: req.params.id }));
    });
});

app.delete('/users/:id', (req, res) => {
    db.run('DELETE FROM users WHERE id = ?', req.params.id, function(err) {
        if (this.changes === 0) return res.status(404).json({ statusCode: 404, error: "Usuario no encontrado" });
        res.json(formatResponse({ deleted: this.changes }));
    });
});

app.get('/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => res.json(formatResponse(rows)));
});

app.post('/products', (req, res) => {
    if (!req.body.name) return res.status(400).json({ statusCode: 400, error: "Falta el nombre del producto" });
    db.run('INSERT INTO products (name) VALUES (?)', [req.body.name], function(err) {
        res.json(formatResponse({ id: this.lastID, name: req.body.name }));
    });
});

app.patch('/products/:id', (req, res) => {
    if (!req.body.name) return res.status(400).json({ statusCode: 400, error: "Falta el nombre a actualizar" });
    db.run('UPDATE products SET name = ? WHERE id = ?', [req.body.name, req.params.id], function(err) {
        if (this.changes === 0) return res.status(404).json({ statusCode: 404, error: "Producto no encontrado" });
        res.json(formatResponse({ updated: this.changes, id: req.params.id }));
    });
});

app.delete('/products/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', req.params.id, function(err) {
        if (this.changes === 0) return res.status(404).json({ statusCode: 404, error: "Producto no encontrado" });
        res.json(formatResponse({ deleted: this.changes }));
    });
});

app.get('/status', (req, res) => {
    res.json(formatResponse({ status: "API actualizada en vivo por CI/CD" }));
});

app.post('/echo', (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ statusCode: 400, error: "Body vacío" });
    }
    res.json(formatResponse(req.body));
});

if (require.main === module) {
    app.listen(port, () => console.log(`App ejecutándose en el puerto ${port}`));
    const tcpServer = net.createServer((socket) => {
        socket.on('error', (err) => console.error('Error TCP:', err.message));
        socket.on('data', (data) => {
            const message = data.toString().trim();
            if (message.startsWith('{insert:') && message.endsWith('}')) {
                try {
                    const el = JSON.parse(message.slice(8, -1));
                    db.run('INSERT INTO users (name) VALUES (?)', [el.name], function(e) {
                        if (e) socket.write(`Error: ${e.message}\n`);
                        else socket.write(`{ statusCode: 200, data: { id: ${this.lastID}, name: "${el.name}" } }\n`);
                    });
                } catch(e) { socket.write('Error JSON\n'); }
            } else if (message.startsWith('{get:') && message.endsWith('}')) {
                db.get('SELECT * FROM users WHERE id = ?', [message.slice(5, -1)], (e, row) => {
                    if (row) socket.write(`{ statusCode: 200, data: ${JSON.stringify(row)} }\n`);
                    else socket.write(`{ statusCode: 404, data: "No encontrado" }\n`);
                });
            } else socket.write('Comando no reconocido\n');
        });
    });
    tcpServer.listen(6061, () => console.log('TCP escuchando en 6061'));
}

module.exports = app;