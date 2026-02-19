export class GastosRepository {
    constructor(dbQuery) {
        this.dbQuery = dbQuery;
    }

    async create(monto, descripcion, idUsuario) {
        // Assuming 'gastos' table exists with columns: id, monto, descripcion, fecha, id_usuario
        return await this.dbQuery.run(`
            INSERT INTO gastos (monto, descripcion, id_usuario) 
            VALUES (?, ?, ?)
        `, [monto, descripcion, idUsuario]);
    }

    async getByDateRange(startDate, endDate) {
        return await this.dbQuery.all(`
            SELECT * FROM gastos 
            WHERE fecha BETWEEN ? AND ?
            ORDER BY fecha DESC
        `, [startDate, endDate]);
    }

    async getTotalSince(date) {
        const result = await this.dbQuery.get(`
            SELECT COALESCE(SUM(monto), 0) as total 
            FROM gastos 
            WHERE fecha >= ?
        `, [date]);
        return result?.total || 0;
    }
}
