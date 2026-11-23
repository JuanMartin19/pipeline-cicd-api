const { emitOtelLog } = require('./telemetry');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { dbRun, dbGet, dbAll, initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de trazabilidad HTTP (registra endpoint, statusCode, latencia y timestamp)
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on('finish', () => {
    const duracionMs = Date.now() - inicio;
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'gestion-proceso-desarrollo',
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: duracionMs
    };

    console.log(JSON.stringify(logEntry));
    emitOtelLog(
      logEntry,
      {
        'http.method': req.method,
        'http.route': req.originalUrl,
        'http.status_code': res.statusCode,
        'http.latency_ms': duracionMs
      },
      res.statusCode >= 400
    );
  });
  next();
});

// Healthcheck para monitoreo y Playwright webServer
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// ==================== AUTENTICACIÓN (LOGIN) ====================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Debe ingresar correo y contraseña' });
    }

    const user = await dbGet(
      'SELECT id, nombre, email, rol FROM users WHERE email = ? AND password = ?',
      [email.trim(), password]
    );

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token: `uteq-session-${user.id}-${Date.now()}`,
      user
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno al autenticar', detalle: error.message });
  }
});

// ==================== CRUD USERS ====================
app.get('/api/users', async (req, res) => {
  try {
    const users = await dbAll('SELECT id, nombre, email, rol FROM users ORDER BY id ASC');
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await dbGet('SELECT id, nombre, email, rol FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }

    const duplicado = await dbGet('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (duplicado) {
      return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
    }

    const rolFinal = rol && rol.trim() !== '' ? rol.trim() : 'usuario';
    const result = await dbRun(
      'INSERT INTO users (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre.trim(), email.trim(), password, rolFinal]
    );

    const nuevo = await dbGet('SELECT id, nombre, email, rol FROM users WHERE id = ?', [result.id]);
    return res.status(201).json(nuevo);
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear usuario', detalle: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const existente = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!existente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    }

    const nuevaPassword = password && password.trim() !== '' ? password : existente.password;
    const nuevoRol = rol && rol.trim() !== '' ? rol.trim() : existente.rol;

    await dbRun(
      'UPDATE users SET nombre = ?, email = ?, password = ?, rol = ? WHERE id = ?',
      [nombre.trim(), email.trim(), nuevaPassword, nuevoRol, req.params.id]
    );

    const actualizado = await dbGet('SELECT id, nombre, email, rol FROM users WHERE id = ?', [req.params.id]);
    return res.status(200).json(actualizado);
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar usuario', detalle: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.status(200).json({ message: 'Usuario eliminado correctamente', id: Number(req.params.id) });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// ==================== CRUD PRODUCTOS ====================
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await dbAll('SELECT * FROM productos ORDER BY id ASC');
    return res.status(200).json(productos);
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar productos' });
  }
});

app.get('/api/productos/:id', async (req, res) => {
  try {
    const producto = await dbGet('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    return res.status(200).json(producto);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener producto' });
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock } = req.body;
    if (!nombre || precio === undefined || precio === null || isNaN(Number(precio))) {
      return res.status(400).json({ error: 'Nombre y precio numérico son obligatorios' });
    }

    const precioNum = Number(precio);
    const stockNum = stock !== undefined && stock !== '' ? parseInt(stock, 10) : 0;

    if (precioNum < 0 || stockNum < 0) {
      return res.status(400).json({ error: 'Precio y stock no pueden ser negativos' });
    }

    const result = await dbRun(
      'INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)',
      [nombre.trim(), (descripcion || '').trim(), precioNum, stockNum]
    );

    const nuevo = await dbGet('SELECT * FROM productos WHERE id = ?', [result.id]);
    return res.status(201).json(nuevo);
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear producto', detalle: error.message });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock } = req.body;
    const existente = await dbGet('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    if (!existente) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (!nombre || precio === undefined || isNaN(Number(precio))) {
      return res.status(400).json({ error: 'Nombre y precio válido son obligatorios' });
    }

    const precioNum = Number(precio);
    const stockNum = stock !== undefined && stock !== '' ? parseInt(stock, 10) : existente.stock;

    await dbRun(
      'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ? WHERE id = ?',
      [nombre.trim(), (descripcion || '').trim(), precioNum, stockNum, req.params.id]
    );

    const actualizado = await dbGet('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    return res.status(200).json(actualizado);
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar producto', detalle: error.message });
  }
});

app.delete('/api/productos/:id', async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM productos WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    return res.status(200).json({ message: 'Producto eliminado correctamente', id: Number(req.params.id) });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// Cierre limpio exclusivo para recolección de cobertura V8 en pruebas
if (process.env.NODE_ENV === 'test') {
  app.post('/api/test-shutdown', (req, res) => {
    res.status(200).json({ status: 'shutting_down' });
    setTimeout(() => process.exit(0), 100);
  });
}

// Inicializar DB y arrancar servidor
if (require.main === module) {
  initDb()
    .then(() => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Error al inicializar la base de datos:', err);
      process.exit(1);
    });
}

module.exports = { app, initDb };