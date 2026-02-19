import express from 'express';
import { verifyToken, requireRole, ROLES } from '../middleware/auth.js';

const router = express.Router();

// GET /api/productos - Listar todos los productos
router.get('/', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { categoria } = req.query;

        let query = `
      SELECT p.id, p.nombre, p.descripcion, p.stock_actual, p.stock_minimo,
             p.precio_costo, p.precio_venta, p.activo,
             c.id as id_categoria, c.nombre as categoria
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id
    `;

        const params = [];
        if (categoria) {
            query += ' WHERE c.nombre = ?';
            params.push(categoria);
        }

        query += ' ORDER BY c.nombre, p.nombre';

        const productos = db.prepare(query).all(...params);

        res.json(productos);
    } catch (error) {
        console.error('Error listando productos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/productos/venta - Solo productos de venta activos (para POS)
router.get('/venta', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;

        const productos = db.prepare(`
      SELECT p.id, p.nombre, p.precio_venta, p.stock_actual
      FROM productos p
      JOIN categorias c ON p.id_categoria = c.id
      WHERE c.nombre = 'Venta' AND p.activo = 1 AND p.stock_actual > 0
      ORDER BY p.nombre
    `).all();

        res.json(productos);
    } catch (error) {
        console.error('Error listando productos de venta:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/productos/alertas - Productos con stock bajo
router.get('/alertas', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), (req, res) => {
    try {
        const db = req.app.locals.db;

        const productos = db.prepare(`
      SELECT p.id, p.nombre, p.stock_actual, p.stock_minimo,
             c.nombre as categoria
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id
      WHERE p.stock_actual <= p.stock_minimo AND p.activo = 1
      ORDER BY (p.stock_actual * 1.0 / p.stock_minimo)
    `).all();

        res.json(productos);
    } catch (error) {
        console.error('Error listando alertas:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/productos/categorias - Listar categorías
router.get('/categorias', verifyToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const categorias = db.prepare('SELECT * FROM categorias ORDER BY nombre').all();
        res.json(categorias);
    } catch (error) {
        console.error('Error listando categorías:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/productos - Crear producto (Admin/Encargado)
router.post('/', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria } = req.body;

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ error: 'El nombre del producto es requerido' });
        }

        // Validar que id_categoria exista
        const categoria = db.prepare('SELECT id FROM categorias WHERE id = ?').get(id_categoria || 1);
        if (!categoria) {
            return res.status(400).json({ error: 'Categoría no válida' });
        }

        const result = db.prepare(`
      INSERT INTO productos (nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
            nombre.trim(),
            descripcion || '',
            parseInt(stock_actual) || 0,
            parseInt(stock_minimo) || 5,
            parseFloat(precio_costo) || 0,
            parseFloat(precio_venta) || 0,
            parseInt(id_categoria) || 1
        );

        // Registrar movimiento de entrada inicial si hay stock
        const stockInicial = parseInt(stock_actual) || 0;
        if (stockInicial > 0) {
            db.prepare(`
        INSERT INTO movimientos_inventario (id_producto, tipo, cantidad, motivo, id_usuario)
        VALUES (?, 'Entrada', ?, 'Stock inicial', ?)
      `).run(result.lastInsertRowid, stockInicial, req.user.id);
        }

        res.status(201).json({
            message: 'Producto creado exitosamente',
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({ error: 'Error al crear el producto: ' + error.message });
    }
});

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { nombre, descripcion, stock_minimo, precio_costo, precio_venta, id_categoria, activo } = req.body;

        db.prepare(`
      UPDATE productos 
      SET nombre = COALESCE(?, nombre),
          descripcion = COALESCE(?, descripcion),
          stock_minimo = COALESCE(?, stock_minimo),
          precio_costo = COALESCE(?, precio_costo),
          precio_venta = COALESCE(?, precio_venta),
          id_categoria = COALESCE(?, id_categoria),
          activo = COALESCE(?, activo)
      WHERE id = ?
    `).run(nombre, descripcion, stock_minimo, precio_costo, precio_venta, id_categoria, activo, id);

        res.json({ message: 'Producto actualizado' });
    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/productos/:id/movimiento - Registrar movimiento de inventario
router.post('/:id/movimiento', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { tipo, cantidad, motivo } = req.body;

        if (!tipo || !cantidad) {
            return res.status(400).json({ error: 'Tipo y cantidad son requeridos' });
        }

        // Obtener stock actual
        const producto = db.prepare('SELECT stock_actual FROM productos WHERE id = ?').get(id);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        let nuevoStock = producto.stock_actual;
        if (tipo === 'Entrada') {
            nuevoStock += cantidad;
        } else if (tipo === 'Salida') {
            if (producto.stock_actual < cantidad) {
                return res.status(400).json({ error: 'Stock insuficiente' });
            }
            nuevoStock -= cantidad;
        } else if (tipo === 'Ajuste') {
            nuevoStock = cantidad;
        }

        // Actualizar stock
        db.prepare('UPDATE productos SET stock_actual = ? WHERE id = ?').run(nuevoStock, id);

        // Registrar movimiento
        db.prepare(`
      INSERT INTO movimientos_inventario (id_producto, tipo, cantidad, motivo, id_usuario)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, tipo, cantidad, motivo || '', req.user.id);

        res.json({
            message: 'Movimiento registrado',
            nuevoStock
        });
    } catch (error) {
        console.error('Error registrando movimiento:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/productos/:id/movimientos - Historial de movimientos
router.get('/:id/movimientos', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        const movimientos = db.prepare(`
      SELECT m.id, m.tipo, m.cantidad, m.motivo, m.fecha,
             u.nombre as usuario
      FROM movimientos_inventario m
      LEFT JOIN usuarios u ON m.id_usuario = u.id
      WHERE m.id_producto = ?
      ORDER BY m.fecha DESC
      LIMIT 50
    `).all(id);

        res.json(movimientos);
    } catch (error) {
        console.error('Error listando movimientos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;
