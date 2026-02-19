export class EntradasEfectivoRepository {
    constructor(dbQuery) {
        this.dbQuery = dbQuery;
    }

    /**
     * Crear una nueva entrada de efectivo
     */
    async create(monto, descripcion, idUsuario, idCorte = null) {
        return await this.dbQuery.run(`
            INSERT INTO entradas_efectivo (monto, descripcion, id_usuario, id_corte) 
            VALUES (?, ?, ?, ?)
        `, [monto, descripcion, idUsuario, idCorte]);
    }

    /**
     * Obtener todas las entradas de un rango de fechas
     */
    async getByDateRange(startDate, endDate) {
        return await this.dbQuery.all(`
            SELECT e.*, u.nombre as usuario_nombre 
            FROM entradas_efectivo e
            LEFT JOIN usuarios u ON e.id_usuario = u.id
            WHERE e.fecha BETWEEN ? AND ?
            ORDER BY e.fecha DESC
        `, [startDate, endDate]);
    }

    /**
     * Obtener total de entradas desde una fecha específica
     */
    async getTotalSince(date) {
        const result = await this.dbQuery.get(`
            SELECT COALESCE(SUM(monto), 0) as total 
            FROM entradas_efectivo 
            WHERE fecha >= ?
        `, [date]);
        return result?.total || 0;
    }

    /**
     * Obtener entradas asociadas a un corte específico
     */
    async getByCorte(idCorte) {
        return await this.dbQuery.all(`
            SELECT e.*, u.nombre as usuario_nombre
            FROM entradas_efectivo e
            LEFT JOIN usuarios u ON e.id_usuario = u.id
            WHERE e.id_corte = ?
            ORDER BY e.fecha ASC
        `, [idCorte]);
    }

    /**
     * Asociar entradas sin corte a un corte específico
     */
    async asociarACorte(fechaApertura, idCorte) {
        return await this.dbQuery.run(`
            UPDATE entradas_efectivo 
            SET id_corte = ? 
            WHERE fecha >= ? AND id_corte IS NULL
        `, [idCorte, fechaApertura]);
    }
}
