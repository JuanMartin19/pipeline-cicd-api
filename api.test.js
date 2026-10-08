const request = require('supertest');
const app = require('./api');

describe('Pruebas Unitarias de Endpoints - API Node.js', () => {
    
    test('1. GET /status - Verifica estado de la API (200 OK)', async () => {
        const res = await request(app).get('/status');
        expect(res.statusCode).toBe(200);
    });

    test('2. GET /ruta-inventada - Falla al consumir endpoint que no existe (404 Not Found)', async () => {
        const res = await request(app).get('/ruta-inventada');
        expect(res.statusCode).toBe(404);
    });

    test('3. POST /status - Falla al usar un método HTTP incorrecto en una ruta válida (404 Not Found)', async () => {
        const res = await request(app).post('/status');
        expect(res.statusCode).toBe(404);
    });

    test('4. POST /users - Falla al enviar body vacío (400 Bad Request)', async () => {
        const res = await request(app).post('/users').send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe("Falta el nombre");
    });

    test('5. POST /users - Falla al enviar la llave incorrecta (400 Bad Request)', async () => {
        const res = await request(app).post('/users').send({ apellido: "Perez" });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe("Falta el nombre");
    });

    test('6. POST /users - Crea un usuario exitosamente (200 OK)', async () => {
        const res = await request(app).post('/users').send({ name: "Juan Martin" });
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.name).toBe("Juan Martin");
    });

    test('7. GET /users - Lista los usuarios correctamente (200 OK)', async () => {
        const res = await request(app).get('/users');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    test('8. PUT /users/:id - Falla al actualizar un ID que no existe (404 Not Found)', async () => {
        const res = await request(app).put('/users/9999').send({ name: "Usuario Fantasma" });
        expect(res.statusCode).toBe(404);
        expect(res.body.error).toBe("Usuario no encontrado");
    });

    test('9. PUT /users/:id - Falla al actualizar con datos nulos (400 Bad Request)', async () => {
        const res = await request(app).put('/users/1').send({ name: "" });
        expect(res.statusCode).toBe(400);
    });

    test('10. DELETE /users/:id - Falla al eliminar un ID que no existe (404 Not Found)', async () => {
        const res = await request(app).delete('/users/9999');
        expect(res.statusCode).toBe(404);
        expect(res.body.error).toBe("Usuario no encontrado");
    });

    test('11. DELETE /users/:id - Falla si el ID enviado es texto en lugar de numero', async () => {
        const res = await request(app).delete('/users/texto_invalido');
        expect(res.statusCode).toBe(404);
    });

    test('12. POST /products - Crea un producto exitosamente (200 OK)', async () => {
        const res = await request(app).post('/products').send({ name: 'Laptop Gamer' });
        expect(res.statusCode).toBe(200);
        expect(res.body.data.name).toBe('Laptop Gamer');
    });

    test('13. POST /products - Falla si envía un arreglo en lugar de un objeto (400 Bad Request)', async () => {
        const res = await request(app).post('/products').send([{ name: "Teclado" }]);
        expect(res.statusCode).toBe(400);
    });

    test('14. PATCH /products/:id - Falla al enviar actualización con datos nulos (400 Bad Request)', async () => {
        const res = await request(app).patch('/products/1').send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe("Falta el nombre a actualizar");
    });

    test('15. PATCH /products/:id - Falla al actualizar un producto inexistente (404 Not Found)', async () => {
        const res = await request(app).patch('/products/9999').send({ name: "Monitor" });
        expect(res.statusCode).toBe(404);
    });

    test('16. DELETE /products/:id - Maneja eliminación del producto correctamente', async () => {
        const res = await request(app).delete('/products/1');
        expect([200, 404]).toContain(res.statusCode); 
    });

    test('17. GET /products - Lista los productos correctamente (200 OK)', async () => {
        const res = await request(app).get('/products');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    test('18. POST /echo - Falla al intentar enviar un payload completamente vacío (400 Bad Request)', async () => {
        const res = await request(app).post('/echo').send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe("Body vacío");
    });

    test('19. POST /echo - Falla si se envían datos nulos explícitos (400 Bad Request)', async () => {
        const res = await request(app).post('/echo').send(null);
        expect(res.statusCode).toBe(400);
    });

    test('20. POST /echo - Retorna los mismos datos enviados si el body es válido (200 OK)', async () => {
        const payload = { mensaje: "Prueba de carga", id: 123 };
        const res = await request(app).post('/echo').send(payload);
        expect(res.statusCode).toBe(200);
        expect(res.body.data.mensaje).toBe("Prueba de carga");
    });
});