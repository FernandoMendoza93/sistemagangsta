const http = require('http');

function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'localhost', port: 3000, path, method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) opts.headers['Authorization'] = `Bearer ${token}`;
        const req = http.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function listenSSE(clienteToken) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost', port: 3000,
            path: '/api/loyalty/stream?token=' + clienteToken,
            method: 'GET'
        }, res => {
            console.log(`📡 SSE Stream connected (status: ${res.statusCode})`);
            resolve(res); // Return connection so I can listen to 'data'
        });
        req.end();
    });
}

async function main() {
    // 1. Login as Admin
    console.log('Logging in as Admin...');
    const loginAdmin = await request('POST', '/api/auth/login', { email: 'admin@barberia.com', password: 'admin123' });
    const adminToken = loginAdmin.body.token;

    // 2. Login as Cliente Pedro
    console.log('Logging in as Cliente Pedro...');
    const loginCliente = await request('POST', '/api/auth/cliente', { telefono: '9511289141', nombre: 'Pedro', password: 'admin123' });
    const clienteToken = loginCliente.body.token;
    console.log('Cliente Token received.');

    // 3. Connect Cliente to SSE
    const sseRes = await listenSSE(clienteToken);
    sseRes.on('data', chunk => {
        const txt = chunk.toString();
        if (txt.includes('STAMP_ADDED')) {
            console.log('\n🎉 EVENTO SSE RECIBIDO EN CLIENTE:', txt.trim());
            console.log('Test Exitosa. Saliendo...');
            process.exit(0);
        } else if (txt.includes('ping')) {
            console.log('📡 SSE Ping recibido');
        }
    });

    // Wait a second for SSE to establish
    await new Promise(r => setTimeout(r, 1000));

    // 4. Admin Scans Cliente's QR (Simulated ID: FLOW-1-1)
    console.log('\nAdmin: Escaneando QR de Pedro...');
    const qrToken = Buffer.from('FLOW-1-1').toString('base64');

    // Using the NEW endpoint POST /scan
    const scanRes = await request('POST', '/api/loyalty/scan', { token: qrToken }, adminToken);

    console.log('API Response:', scanRes.status);
    console.log(JSON.stringify(scanRes.body, null, 2));

    if (scanRes.body.success) {
        if (scanRes.body.action === 'ALREADY_ADDED') {
            console.log('Anti-spam alertado: Ya se le había escaneado hoy.');
            process.exit(0);
        } else {
            console.log('Esperando evento SSE...');
        }
    } else {
        console.error('Test fallido');
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
