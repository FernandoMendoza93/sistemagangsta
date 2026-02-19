const bcrypt = require('bcryptjs');
const { db, initializeDatabase, hasData } = require('../config/sqlite');

async function seedDatabase() {
    console.log('🌱 Poblando base de datos con datos de demo...');

    // Verificar si ya tiene datos
    if (hasData()) {
        console.log('⚠️  La base de datos ya tiene datos. Saltando seed.');
        return;
    }

    try {
        // Iniciar transacción
        db.prepare('BEGIN').run();

        // 1. Insertar Roles
        console.log('📝 Creando roles...');
        const insertRole = db.prepare('INSERT INTO roles (nombre_rol) VALUES (?)');
        insertRole.run('Admin');
        insertRole.run('Encargado');
        insertRole.run('Barbero');

        // 2. Insertar Usuarios
        console.log('👤 Creando usuarios...');
        const passwordHash = await bcrypt.hash('admin123', 10);
        const insertUser = db.prepare(`
            INSERT INTO usuarios (nombre, email, password, id_rol, activo) 
            VALUES (?, ?, ?, ?, ?)
        `);

        insertUser.run('Administrador', 'admin@barberia.com', passwordHash, 1, 1);
        insertUser.run('Carlos García', 'carlos@barberia.com', passwordHash, 2, 1);
        insertUser.run('Juan Pérez', 'juan@barberia.com', passwordHash, 3, 1);
        insertUser.run('Miguel Torres', 'miguel@barberia.com', passwordHash, 3, 1);

        // 3. Insertar Barberos
        console.log('✂️  Creando barberos...');
        const insertBarbero = db.prepare('INSERT INTO barberos (id_usuario, turno) VALUES (?, ?)');
        insertBarbero.run(3, 'Mañana');
        insertBarbero.run(4, 'Tarde');

        // 4. Insertar Servicios
        console.log('💈 Creando servicios...');
        const insertServicio = db.prepare(`
            INSERT INTO servicios (nombre_servicio, precio, duracion_aprox, activo) 
            VALUES (?, ?, ?, ?)
        `);

        insertServicio.run('Corte Clásico', 150.00, 30, 1);
        insertServicio.run('Corte + Barba', 250.00, 45, 1);
        insertServicio.run('Degradado Moderno', 200.00, 40, 1);
        insertServicio.run('Rasura Tradicional', 100.00, 25, 1);
        insertServicio.run('Diseño de Barba', 180.00, 35, 1);
        insertServicio.run('Tinte de Cabello', 300.00, 60, 1);

        // 5. Insertar Categorías
        console.log('🏷️  Creando categorías...');
        const insertCategoria = db.prepare('INSERT INTO categorias (nombre_categoria) VALUES (?)');
        insertCategoria.run('Cuidado del Cabello');
        insertCategoria.run('Cuidado de la Barba');
        insertCategoria.run('Estilizado');
        insertCategoria.run('Accesorios');

        // 6. Insertar Productos
        console.log('📦 Creando productos...');
        const insertProducto = db.prepare(`
            INSERT INTO productos (nombre_producto, id_categoria, precio_venta, precio_compra, stock_actual, stock_minimo, activo) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        insertProducto.run('Shampoo Premium', 1, 120.00, 60.00, 25, 10, 1);
        insertProducto.run('Cera para Cabello', 3, 90.00, 45.00, 30, 8, 1);
        insertProducto.run('Aceite de Barba', 2, 150.00, 75.00, 15, 5, 1);
        insertProducto.run('Navaja Profesional', 4, 450.00, 220.00, 8, 3, 1);
        insertProducto.run('Gel Extra Fuerte', 3, 85.00, 40.00, 35, 10, 1);
        insertProducto.run('Bálsamo para Barba', 2, 130.00, 65.00, 20, 5, 1);
        insertProducto.run('Pomada Mate', 3, 95.00, 48.00, 3, 8, 1);
        insertProducto.run('Espuma de Afeitar', 2, 70.00, 35.00, 40, 12, 1);

        // 7. Crear algunos registros de ventas de ejemplo
        console.log('💰 Creando ventas de ejemplo...');
        const insertVenta = db.prepare(`
            INSERT INTO ventas (fecha, id_barbero, metodo_pago, total_venta, id_usuario) 
            VALUES (?, ?, ?, ?, ?)
        `);

        const hoy = new Date().toISOString();
        const ventaId1 = insertVenta.run(hoy, 1, 'Efectivo', 250.00, 3).lastInsertRowid;
        const ventaId2 = insertVenta.run(hoy, 2, 'Tarjeta', 370.00, 4).lastInsertRowid;
        const ventaId3 = insertVenta.run(hoy, 1, 'Efectivo', 150.00, 3).lastInsertRowid;

        // 8. Crear detalles de ventas
        const insertDetalle = db.prepare(`
            INSERT INTO detalle_ventas (id_venta, id_servicio, id_producto, cantidad, precio_unitario, subtotal) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        // Venta 1: Corte + Barba
        insertDetalle.run(ventaId1, 2, null, 1, 250.00, 250.00);

        // Venta 2: Degradado + Cera
        insertDetalle.run(ventaId2, 3, null, 1, 200.00, 200.00);
        insertDetalle.run(ventaId2, null, 2, 2, 85.00, 170.00);

        // Venta 3: Corte Clásico
        insertDetalle.run(ventaId3, 1, null, 1, 150.00, 150.00);

        // 9. Crear corte de caja abierto
        console.log('📊 Creando corte de caja...');
        const insertCorte = db.prepare(`
            INSERT INTO cortes_caja (id_encargado, monto_inicial, estado) 
            VALUES (?, ?, ?)
        `);
        insertCorte.run(2, 500.00, 'abierto');

        // Confirmar transacción
        db.prepare('COMMIT').run();

        console.log('✅ Base de datos poblada exitosamente con datos de demo');
        console.log('');
        console.log('📋 Credentials de acceso:');
        console.log('   Email: admin@barberia.com');
        console.log('   Password: admin123');
        console.log('');

    } catch (error) {
        // Rollback en caso de error
        db.prepare('ROLLBACK').run();
        console.error('❌ Error poblando la base de datos:', error);
        throw error;
    }
}

// Ejecutar si se corre directamente
if (require.main === module) {
    initializeDatabase();
    seedDatabase().then(() => {
        console.log('🎉 Proceso completado');
        process.exit(0);
    }).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

module.exports = { seedDatabase };
