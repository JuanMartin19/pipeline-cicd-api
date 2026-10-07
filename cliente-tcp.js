const net = require('net');

const client = new net.Socket();
const IP_AWS = '18.223.115.53';
const PORT = 6061;

client.connect(PORT, IP_AWS, () => {
    console.log('Conectado al EC2 en puerto 6061');
    
    console.log('Enviando: {insert:{"name":"CARLITOS"}}');
    client.write('{insert:{"name":"CARLITOS"}}\n');
});

client.on('data', (data) => {
    const respuesta = data.toString().trim();
    console.log('Respuesta de AWS: ' + respuesta);

    if (respuesta.includes('CARLITOS') && respuesta.includes('id:')) {
        try {
            const match = respuesta.match(/id:\s*(\d+)/);
            if (match) {
                const idGenerado = match[1];
                setTimeout(() => {
                    console.log(`\nEnviando: {get:${idGenerado}}`);
                    client.write(`{get:${idGenerado}}\n`);
                }, 1000);
            }
        } catch(e) {
            console.log("Error al extraer el ID");
        }
    }
});