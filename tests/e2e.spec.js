const { test, expect } = require('@playwright/test');

// ============================================================================
// SUITE 1: API DE SALUD, SEGURIDAD Y AUTENTICACIÓN (/api/health y /api/login)
// ============================================================================
test.describe.serial('1. API de Salud y Autenticación (10 pruebas)', () => {
  const authEmail = `admin.qa.${Date.now()}@uteq.edu.mx`;
  const authPass = 'AdminQA1234';
  let authUserId;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/users', {
      data: {
        nombre: 'Admin Prueba Login',
        email: authEmail,
        password: authPass,
        rol: 'admin',
      },
    });
    const body = await res.json();
    authUserId = body.id || body.user?.id || body.data?.id;
  });

  test.afterAll(async ({ request }) => {
    if (authUserId) {
      await request.delete(`/api/users/${authUserId}`);
    }
  });

  test('01. GET /api/health responde con estado 200 OK', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
  });

  test('02. GET /api/health responde en menos de 500 ms', async ({ request }) => {
    const inicio = Date.now();
    const res = await request.get('/api/health');
    const duracion = Date.now() - inicio;
    expect(res.status()).toBe(200);
    expect(duracion).toBeLessThan(500);
  });

  test('03. POST /api/login rechaza cuerpo vacío con HTTP 400', async ({ request }) => {
    const res = await request.post('/api/login', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('04. POST /api/login rechaza solicitud sin contraseña con HTTP 400', async ({ request }) => {
    const res = await request.post('/api/login', {
      data: { email: authEmail },
    });
    expect(res.status()).toBe(400);
  });

  test('05. POST /api/login rechaza solicitud sin correo con HTTP 400', async ({ request }) => {
    const res = await request.post('/api/login', {
      data: { password: authPass },
    });
    expect(res.status()).toBe(400);
  });

  test('06. POST /api/login rechaza contraseña incorrecta con HTTP 401', async ({ request }) => {
    const res = await request.post('/api/login', {
      data: { email: authEmail, password: 'clave_incorrecta_999' },
    });
    expect(res.status()).toBe(401);
  });

  test('07. POST /api/login rechaza usuario inexistente con HTTP 401', async ({ request }) => {
    const res = await request.post('/api/login', {
      data: { email: 'noexiste@uteq.edu.mx', password: authPass },
    });
    expect(res.status()).toBe(401);
  });

  test('08. POST /api/login autentica correctamente al usuario con HTTP 200', async ({ request }) => {
    const res = await request.post('/api/login', {
      data: { email: authEmail, password: authPass },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
  });

  test('09. GET a endpoint inexistente devuelve HTTP 404', async ({ request }) => {
    const res = await request.get('/api/endpoint-que-no-existe');
    expect(res.status()).toBe(404);
  });

  test('10. UI E2E: Carga correcta de pantalla de inicio de sesión (index.html)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="email"], #email')).toBeVisible();
    await expect(page.locator('input[type="password"], #password')).toBeVisible();
  });
});

// ============================================================================
// SUITE 2: API DE GESTIÓN DE USUARIOS (/api/users)
// ============================================================================
test.describe.serial('2. API CRUD de Usuarios /api/users (10 pruebas)', () => {
  let createdUserId;
  const testEmail = `qa.usuario.${Date.now()}@uteq.edu.mx`;
  const originalPassword = 'PasswordPrueba123';

  test('01. GET /api/users devuelve el listado de usuarios con HTTP 200', async ({ request }) => {
    const res = await request.get('/api/users');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const lista = Array.isArray(body) ? body : body.users || body.data || [];
    expect(Array.isArray(lista)).toBeTruthy();
  });

  test('02. POST /api/users rechaza registro sin campos obligatorios (HTTP 400)', async ({ request }) => {
    const res = await request.post('/api/users', {
      data: { nombre: 'Incompleto' },
    });
    expect(res.status()).toBe(400);
  });

  test('03. POST /api/users crea un nuevo usuario válido correctamente', async ({ request }) => {
    const res = await request.post('/api/users', {
      data: {
        nombre: 'Usuario Prueba QA',
        email: testEmail,
        password: originalPassword,
        rol: 'usuario',
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    createdUserId = body.id || body.user?.id || body.data?.id;
    expect(createdUserId).toBeTruthy();
  });

  test('04. POST /api/users bloquea correo electrónico duplicado con HTTP 409', async ({ request }) => {
    const res = await request.post('/api/users', {
      data: {
        nombre: 'Usuario Duplicado',
        email: testEmail,
        password: 'OtraPassword123',
        rol: 'usuario',
      },
    });
    expect([400, 409]).toContain(res.status());
  });

  test('05. GET /api/users/:id consulta el usuario creado por su ID (HTTP 200)', async ({ request }) => {
    const res = await request.get(`/api/users/${createdUserId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const user = body.user || body.data || body;
    expect(user.email).toBe(testEmail);
  });

  test('06. GET /api/users/:id devuelve HTTP 404 para un ID inexistente', async ({ request }) => {
    const res = await request.get('/api/users/9999999');
    expect(res.status()).toBe(404);
  });

  test('07. PUT /api/users/:id actualiza nombre sin borrar contraseña previa', async ({ request }) => {
    const res = await request.put(`/api/users/${createdUserId}`, {
      data: {
        nombre: 'Usuario QA Actualizado',
        email: testEmail,
        rol: 'admin',
      },
    });
    expect(res.status()).toBe(200);
  });

  test('08. POST /api/login confirma que la contraseña protegida sigue funcionando', async ({ request }) => {
    const res = await request.post('/api/login', {
      data: {
        email: testEmail,
        password: originalPassword,
      },
    });
    expect(res.status()).toBe(200);
  });

  test('09. PUT /api/users/:id devuelve HTTP 404 al editar usuario inexistente', async ({ request }) => {
    const res = await request.put('/api/users/9999999', {
      data: { nombre: 'Fantasma', email: 'fantasma@uteq.edu.mx' },
    });
    expect(res.status()).toBe(404);
  });

  test('10. DELETE /api/users/:id elimina el usuario y confirma 404 posterior', async ({ request }) => {
    const delRes = await request.delete(`/api/users/${createdUserId}`);
    expect(delRes.status()).toBe(200);

    const checkRes = await request.get(`/api/users/${createdUserId}`);
    expect(checkRes.status()).toBe(404);
  });
});

// ============================================================================
// SUITE 3: API DE INVENTARIO Y PRODUCTOS (/api/productos)
// ============================================================================
test.describe.serial('3. API CRUD de Productos /api/productos (10 pruebas)', () => {
  let createdProductId;

  test('01. GET /api/productos devuelve el catálogo con HTTP 200', async ({ request }) => {
    const res = await request.get('/api/productos');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const lista = Array.isArray(body) ? body : body.productos || body.data || [];
    expect(Array.isArray(lista)).toBeTruthy();
  });

  test('02. POST /api/productos rechaza objeto vacío sin nombre/precio (HTTP 400)', async ({ request }) => {
    const res = await request.post('/api/productos', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('03. POST /api/productos bloquea precio negativo con HTTP 400', async ({ request }) => {
    const res = await request.post('/api/productos', {
      data: {
        nombre: 'Producto Precio Inválido',
        descripcion: 'Prueba validación negativa',
        precio: -150.5,
        stock: 10,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('04. POST /api/productos bloquea stock negativo con HTTP 400', async ({ request }) => {
    const res = await request.post('/api/productos', {
      data: {
        nombre: 'Producto Stock Inválido',
        descripcion: 'Prueba validación stock',
        precio: 299.99,
        stock: -5,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('05. POST /api/productos registra un nuevo producto válido', async ({ request }) => {
    const res = await request.post('/api/productos', {
      data: {
        nombre: `Laptop UTEQ QA ${Date.now()}`,
        descripcion: 'Equipo de prueba automatizada Playwright',
        precio: 14500.0,
        stock: 8,
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    createdProductId = body.id || body.producto?.id || body.data?.id;
    expect(createdProductId).toBeTruthy();
  });

  test('06. GET /api/productos/:id consulta el producto recién creado (HTTP 200)', async ({ request }) => {
    const res = await request.get(`/api/productos/${createdProductId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const prod = body.producto || body.data || body;
    expect(Number(prod.precio)).toBe(14500);
  });

  test('07. GET /api/productos/:id devuelve HTTP 404 para producto inexistente', async ({ request }) => {
    const res = await request.get('/api/productos/9999999');
    expect(res.status()).toBe(404);
  });

  test('08. PUT /api/productos/:id actualiza precio y stock correctamente (HTTP 200)', async ({ request }) => {
    const res = await request.put(`/api/productos/${createdProductId}`, {
      data: {
        nombre: 'Laptop UTEQ QA Editada',
        descripcion: 'Actualizada por suite E2E',
        precio: 13999.99,
        stock: 12,
      },
    });
    expect(res.status()).toBe(200);
  });

  test('09. PUT /api/productos/:id rechaza precio negativo (400) e ID inexistente (404)', async ({ request }) => {
    const badPriceRes = await request.put(`/api/productos/${createdProductId}`, {
      data: {
        nombre: 'Laptop UTEQ QA Editada',
        precio: -10,
        stock: 5,
      },
    });
    expect(badPriceRes.status()).toBe(400);

    const notFoundRes = await request.put('/api/productos/9999999', {
      data: {
        nombre: 'Inexistente',
        precio: 100,
        stock: 1,
      },
    });
    expect(notFoundRes.status()).toBe(404);
  });

  test('10. DELETE /api/productos/:id elimina el producto y verifica 404 posterior', async ({ request }) => {
    const delRes = await request.delete(`/api/productos/${createdProductId}`);
    expect(delRes.status()).toBe(200);

    const checkRes = await request.get(`/api/productos/${createdProductId}`);
    expect(checkRes.status()).toBe(404);
  });
});

test.afterAll(async () => {
  await fetch('http://localhost:3000/api/test-shutdown', { method: 'POST' }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 300));
});