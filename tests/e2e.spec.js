const { test, expect } = require('@playwright/test');

test.describe('Sistema de Gestión UTEQ - Pruebas E2E y API', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
  });

  test.afterAll(async ({ request }) => {
    try {
      await request.post('/api/test-shutdown');
    } catch (_) {
      // El servidor cierra inmediatamente después de responder
    }
  });

  test('1. Healthcheck y validaciones de seguridad de API REST', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(health.status()).toBe(200);
    const healthBody = await health.json();
    expect(healthBody.status).toBe('ok');

    const badReq = await request.post('/api/login', { data: { email: '' } });
    expect(badReq.status()).toBe(400);

    const badProd = await request.post('/api/productos', {
      data: { nombre: 'Inválido', precio: -50, stock: 1 },
    });
    expect(badProd.status()).toBe(400);
  });

  test('2. Login rechaza credenciales incorrectas y permite acceso válido', async ({ page }) => {
    await page.goto('/index.html');

    await page.locator('input[type="email"]').fill('admin@uteq.edu.mx');
    await page.locator('input[type="password"]').fill('ClaveErronea999');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page).toHaveURL(/index\.html/);

    await page.locator('input[type="email"]').fill('admin@uteq.edu.mx');
    await page.locator('input[type="password"]').fill('Admin123*');
    await page.getByRole('button', { name: /ingresar/i }).click();

    await expect(page).toHaveURL(/dashboard\.html/);
    await expect(page.getByText(/Panel de Administración/i)).toBeVisible();
  });

  test('3. CRUD completo de Usuarios (Crear, Leer, Actualizar, Eliminar)', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('input[type="email"]').fill('admin@uteq.edu.mx');
    await page.locator('input[type="password"]').fill('Admin123*');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page).toHaveURL(/dashboard\.html/);

    const seccionUsuarios = page.locator('section, .card, div').filter({
      has: page.getByRole('heading', { name: /Gestión de Usuarios/i }),
    }).first();

    const correoPrueba = `qa.usuario.${Date.now()}@uteq.edu.mx`;

    // CREATE (ignorando el input oculto user-id)
    const inputsUsuario = seccionUsuarios.locator('input:not([type="hidden"])');
    await inputsUsuario.nth(0).fill('Usuario Prueba Playwright');
    await inputsUsuario.nth(1).fill(correoPrueba);
    await inputsUsuario.nth(2).fill('TestPass123*');
    await seccionUsuarios.getByRole('button', { name: /guardar usuario/i }).click();

    // READ
    const filaUsuario = seccionUsuarios.locator('tr', { hasText: correoPrueba });
    await expect(filaUsuario).toBeVisible();
    await expect(filaUsuario).toContainText('Usuario Prueba Playwright');

    // UPDATE
    await filaUsuario.getByRole('button', { name: /editar/i }).click();
    await inputsUsuario.nth(0).fill('Usuario Editado QA');
    await seccionUsuarios.getByRole('button', { name: /guardar|actualizar/i }).click();
    await expect(seccionUsuarios.locator('tr', { hasText: 'Usuario Editado QA' })).toBeVisible();

    // DELETE
    const filaEditada = seccionUsuarios.locator('tr', { hasText: 'Usuario Editado QA' });
    await filaEditada.getByRole('button', { name: /eliminar/i }).click();
    await expect(seccionUsuarios.locator('tr', { hasText: correoPrueba })).toHaveCount(0);
  });

  test('4. CRUD completo de Productos (Crear, Leer, Actualizar, Eliminar) y Logout', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('input[type="email"]').fill('admin@uteq.edu.mx');
    await page.locator('input[type="password"]').fill('Admin123*');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page).toHaveURL(/dashboard\.html/);

    const seccionProductos = page.locator('section, .card, div').filter({
      has: page.getByRole('heading', { name: /Gestión de Productos/i }),
    }).first();

    const nombreProducto = `Teclado QA ${Date.now()}`;

    // CREATE (ignorando el input oculto prod-id)
    const inputsProducto = seccionProductos.locator('input:not([type="hidden"])');
    await inputsProducto.nth(0).fill(nombreProducto);
    await inputsProducto.nth(1).fill('Switch mecánico de prueba');
    await inputsProducto.nth(2).fill('1499.50');
    await inputsProducto.nth(3).fill('15');
    await seccionProductos.getByRole('button', { name: /guardar producto/i }).click();

    // READ
    const filaProducto = seccionProductos.locator('tr', { hasText: nombreProducto });
    await expect(filaProducto).toBeVisible();
    await expect(filaProducto).toContainText('1499.50');

    // UPDATE
    await filaProducto.getByRole('button', { name: /editar/i }).click();
    await inputsProducto.nth(2).fill('1799.00');
    await seccionProductos.getByRole('button', { name: /guardar|actualizar/i }).click();
    await expect(seccionProductos.locator('tr', { hasText: '1799.00' })).toBeVisible();

    // DELETE
    const filaActualizada = seccionProductos.locator('tr', { hasText: nombreProducto });
    await filaActualizada.getByRole('button', { name: /eliminar/i }).click();
    await expect(seccionProductos.locator('tr', { hasText: nombreProducto })).toHaveCount(0);

    // LOGOUT
    await page.getByRole('button', { name: /cerrar sesión/i }).click();
    await expect(page).toHaveURL(/index\.html/);
  });
});