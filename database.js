const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDb() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'usuario'
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT DEFAULT '',
      precio REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Usuario administrador por defecto para pruebas y entrega
  const adminExiste = await dbGet('SELECT id FROM users WHERE email = ?', ['admin@uteq.edu.mx']);
  if (!adminExiste) {
    await dbRun(
      'INSERT INTO users (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      ['Administrador UTEQ', 'admin@uteq.edu.mx', 'Admin123*', 'admin']
    );
  }

  // Productos iniciales de demostración
  const totalProd = await dbGet('SELECT COUNT(*) AS total FROM productos');
  if (totalProd && totalProd.total === 0) {
    await dbRun(
      'INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)',
      ['Laptop Dell Latitude', 'Equipo empresarial 16GB RAM 512GB SSD', 18500.00, 12]
    );
    await dbRun(
      'INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)',
      ['Monitor LG 24 pulgadas', 'Panel IPS Full HD 75Hz', 3200.50, 25]
    );
  }
}

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDb
};