import express from 'express';
import { verifyToken, requireRole, ROLES } from '../middleware/auth.js';
import { CorteCajaRepository } from '../repositories/CorteCajaRepository.js';
import { GastosRepository } from '../repositories/GastosRepository.js';
import { EntradasEfectivoRepository } from '../repositories/EntradasEfectivoRepository.js';
import { ExcelAdapter } from '../patterns/ExcelAdapter.js';

const router = express.Router();

// GET /api/corte-caja/actual
router.get('/actual', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const corteRepo = new CorteCajaRepository(dbQuery);
        const gastosRepo = new GastosRepository(dbQuery);
        const entradasRepo = new EntradasEfectivoRepository(dbQuery);

        const corte = await corteRepo.findOpen();

        if (!corte) return res.json({ abierto: false });

        const ingresosEfectivo = await corteRepo.getIngresosEfectivo(corte.fecha_apertura);
        const gastos = await gastosRepo.getTotalSince(corte.fecha_apertura);
        const entradas = await entradasRepo.getTotalSince(corte.fecha_apertura);

        const esperado = corte.monto_inicial + ingresosEfectivo + entradas - gastos;

        res.json({
            abierto: true,
            corte,
            ingresos: { efectivo: ingresosEfectivo },
            gastos,
            entradas,
            esperado
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/corte-caja/desglose - Obtener desglose completo
router.get('/desglose', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const corteRepo = new CorteCajaRepository(dbQuery);
        const gastosRepo = new GastosRepository(dbQuery);
        const entradasRepo = new EntradasEfectivoRepository(dbQuery);

        const corte = await corteRepo.findOpen();
        if (!corte) return res.status(400).json({ error: 'No hay corte abierto' });

        // Desglose por método de pago
        const ventasPorMetodo = await corteRepo.getDesglosePorMetodoPago(corte.fecha_apertura);

        // Rentabilidad por departamento
        const rentabilidad = await corteRepo.getRentabilidadPorDepartamento(corte.fecha_apertura);

        // Movimientos de efectivo
        const gastosList = await gastosRepo.getByDateRange(corte.fecha_apertura, new Date().toISOString());
        const entradasList = await entradasRepo.getByDateRange(corte.fecha_apertura, new Date().toISOString());

        // Calcular totales
        const totalVentas = ventasPorMetodo.reduce((sum, m) => sum + m.total, 0);
        const totalGanancias =
            rentabilidad.servicios.reduce((sum, s) => sum + s.ganancia, 0) +
            rentabilidad.productos.reduce((sum, p) => sum + p.ganancia, 0);

        const ingresosEfectivo = await corteRepo.getIngresosEfectivo(corte.fecha_apertura);
        const totalGastos = await gastosRepo.getTotalSince(corte.fecha_apertura);
        const totalEntradas = await entradasRepo.getTotalSince(corte.fecha_apertura);
        const abonos = await corteRepo.getAbonosEfectivo(corte.fecha_apertura);
        const devoluciones = await corteRepo.getDevolucionesEfectivo(corte.fecha_apertura);

        res.json({
            resumen: {
                total_ventas: totalVentas,
                total_ganancias: totalGanancias,
                dinero_esperado: corte.monto_inicial + ingresosEfectivo + totalEntradas - totalGastos
            },
            ventas_por_metodo: ventasPorMetodo,
            rentabilidad_por_departamento: rentabilidad,
            dinero_en_caja: {
                fondo_inicial: corte.monto_inicial,
                ventas_efectivo: ingresosEfectivo,
                abonos_efectivo: abonos,
                entradas: totalEntradas,
                salidas: totalGastos,
                devoluciones: devoluciones,
                total_esperado: corte.monto_inicial + ingresosEfectivo + totalEntradas - totalGastos
            },
            movimientos: {
                entradas: entradasList,
                salidas: gastosList
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/corte-caja/abrir
router.post('/abrir', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const corteRepo = new CorteCajaRepository(dbQuery);

        const corteAbierto = await corteRepo.findOpen();
        if (corteAbierto) return res.status(400).json({ error: 'Ya existe un corte abierto' });

        const { monto_inicial, modo_cierre } = req.body;
        const result = await corteRepo.createWithDetails(
            monto_inicial || 0,
            req.user.id,
            modo_cierre || 'transparente'
        );

        res.status(201).json({
            message: 'Turno abierto',
            id: result.lastInsertRowid,
            modo: modo_cierre || 'transparente'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/corte-caja/cerrar
router.post('/cerrar', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const corteRepo = new CorteCajaRepository(dbQuery);
        const gastosRepo = new GastosRepository(dbQuery);
        const entradasRepo = new EntradasEfectivoRepository(dbQuery);

        const { monto_real_fisico, notas } = req.body;
        if (monto_real_fisico === undefined) return res.status(400).json({ error: 'Monto requerido' });

        const corte = await corteRepo.findOpen();
        if (!corte) return res.status(400).json({ error: 'No hay corte abierto' });

        // Calcular todos los montos
        const ingresosEfectivo = await corteRepo.getIngresosEfectivo(corte.fecha_apertura);
        const gastos = await gastosRepo.getTotalSince(corte.fecha_apertura);
        const entradas = await entradasRepo.getTotalSince(corte.fecha_apertura);
        const abonos = await corteRepo.getAbonosEfectivo(corte.fecha_apertura);
        const devoluciones = await corteRepo.getDevolucionesEfectivo(corte.fecha_apertura);

        // Calcular ventas y ganancias totales
        const ventasPorMetodo = await corteRepo.getDesglosePorMetodoPago(corte.fecha_apertura);
        const totalVentas = ventasPorMetodo.reduce((sum, m) => sum + m.total, 0);

        const rentabilidad = await corteRepo.getRentabilidadPorDepartamento(corte.fecha_apertura);
        const totalGanancias =
            rentabilidad.servicios.reduce((sum, s) => sum + s.ganancia, 0) +
            rentabilidad.productos.reduce((sum, p) => sum + p.ganancia, 0);

        const esperado = corte.monto_inicial + ingresosEfectivo + entradas - gastos;
        const diferencia = monto_real_fisico - esperado;

        // Asociar entradas sin corte
        await entradasRepo.asociarACorte(corte.fecha_apertura, corte.id);

        // Actualizar con todos los datos
        await corteRepo.updateWithTotals(corte.id, {
            ingresos: ingresosEfectivo,
            montoReal: monto_real_fisico,
            diferencia,
            notas: notas || '',
            totalVentas,
            totalGanancias,
            abonos,
            devoluciones,
            entradas
        });

        await corteRepo.marcarVentasCerradas(corte.fecha_apertura);

        res.json({
            message: 'Turno cerrado',
            resumen: {
                monto_inicial: corte.monto_inicial,
                ingresos: ingresosEfectivo,
                gastos,
                entradas,
                abonos,
                devoluciones,
                esperado,
                monto_real_fisico,
                diferencia,
                total_ventas: totalVentas,
                total_ganancias: totalGanancias
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/corte-caja/historial
router.get('/historial', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const corteRepo = new CorteCajaRepository(dbQuery);
        const cortes = await corteRepo.getHistory();
        res.json(cortes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/corte-caja/gastos
router.post('/gastos', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const gastosRepo = new GastosRepository(dbQuery);

        const { monto, descripcion } = req.body;
        if (!monto || !descripcion) return res.status(400).json({ error: 'Monto y descripción requeridos' });

        await gastosRepo.create(monto, descripcion, req.user.id);
        res.status(201).json({ message: 'Salida registrada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/corte-caja/entradas
router.post('/entradas', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const entradasRepo = new EntradasEfectivoRepository(dbQuery);

        const { monto, descripcion } = req.body;
        if (!monto || !descripcion) return res.status(400).json({ error: 'Monto y descripción requeridos' });

        await entradasRepo.create(monto, descripcion, req.user.id);
        res.status(201).json({ message: 'Entrada registrada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/corte-caja/exportar
router.get('/exportar', verifyToken, requireRole(ROLES.ADMIN, ROLES.ENCARGADO), async (req, res) => {
    try {
        const dbQuery = req.app.locals.dbQuery;
        const corteRepo = new CorteCajaRepository(dbQuery);

        const data = await corteRepo.getHistory(100);

        const adapter = new ExcelAdapter(data);
        const csvContent = adapter.generateReport();

        res.header('Content-Type', 'text/csv');
        res.attachment('corte_caja_historial.csv');
        res.send(csvContent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

export default router;

