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
    db.run('INSERT INTO users (name) VALUES (?)', [req.body.name], function(err) {
        res.json(formatResponse({ id: this.lastID, name: req.body.name }));
    });
});

app.delete('/users/:id', (req, res) => {
    db.run('DELETE FROM users WHERE id = ?', req.params.id, function(err) {
        res.json(formatResponse({ deleted: this.changes }));
    });
});

app.get('/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => res.json(formatResponse(rows)));
});

app.post('/products', (req, res) => {
    db.run('INSERT INTO products (name) VALUES (?)', [req.body.name], function(err) {
        res.json(formatResponse({ id: this.lastID, name: req.body.name }));
    });
});

app.delete('/products/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', req.params.id, function(err) {
        res.json(formatResponse({ deleted: this.changes }));
    });
});

app.get('/status', (req, res) => {
    res.json(formatResponse({ status: "API funcionando correctamente" }));
});

app.post('/echo', (req, res) => {
    res.json(formatResponse(req.body));
});

app.post('/backup', (req, res) => {
    fs.copyFile('./database.sqlite', './database_backup.sqlite', (err) => {
        if (err) return res.status(500).json({ statusCode: 500, data: "Error al respaldar" });
        res.json(formatResponse({ message: "Respaldo creado exitosamente" }));
    });
});

app.get('/respaldo', (req, res) => {
    const file = `${__dirname}/database_backup.sqlite`;
    res.download(file, 'database_backup.sqlite', (err) => {
        if (err) {
            console.error("Error en la descarga:", err);
            // Solo responde con error si los headers no se han enviado al cliente
            if (!res.headersSent) {
                res.status(500).json({ statusCode: 500, data: "El backup no existe aún" });
            }
        }
    });
});

app.delete('/empty', (req, res) => {
    db.run('DELETE FROM users');
    db.run('DELETE FROM products');
    res.json(formatResponse({ message: "Base de datos vaciada" }));
});

app.listen(port, () => {
    console.log(`App ejecutándose en el puerto ${port}`);
});

const tcpServer = net.createServer((socket) => {
    
    socket.on('error', (err) => {
        console.error('Error en el socket TCP:', err.message);
    });

    socket.on('data', (data) => {
        const message = data.toString().trim();
        
        if (message.startsWith('{insert:') && message.endsWith('}')) {
            const jsonString = message.slice(8, -1);
            try {
                const element = JSON.parse(jsonString);
                db.run('INSERT INTO users (name) VALUES (?)', [element.name], function(err) {
                    if (err) socket.write(`Error: ${err.message}\n`);
                    else socket.write(`{ statusCode: 200, data: { id: ${this.lastID}, name: "${element.name}" } }\n`);
                });
            } catch(e) {
                socket.write('Error: Formato JSON invalido\n');
            }
        }
        else if (message.startsWith('{get:') && message.endsWith('}')) {
            const id = message.slice(5, -1);
            db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) socket.write(`Error: ${err.message}\n`);
                else if (row) socket.write(`{ statusCode: 200, data: ${JSON.stringify(row)} }\n`);
                else socket.write(`{ statusCode: 404, data: "No encontrado" }\n`);
            });
        } else {
            socket.write('Comando no reconocido\n');
        }
    });
});

tcpServer.listen(6061, () => {
    console.log('Servidor Socket TCP escuchando en el puerto 6061');
});