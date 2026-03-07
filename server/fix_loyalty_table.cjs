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

async function main() {
    // 1. Login as admin
    const login = await request('POST', '/api/auth/login', { email: 'admin@barberia.com', password: 'admin123' });
    const token = login.body.token;

    // 2. Scan client Pedro (id=1, barberia_id=1)
    const scanToken = Buffer.from('FLOW-1-1').toString('base64');
    const scan = await request('GET', `/api/clientes/scan/${scanToken}`, null, token);
    console.log('Scan result:\n', JSON.stringify(scan.body, null, 2));
}

main().catch(console.error);
