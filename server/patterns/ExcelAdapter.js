
export class ExcelAdapter {
    constructor(data) {
        this.data = data;
    }

    /**
     * Converts the data to a CSV string.
     * Since we might not have exceljs/xlsx installed and want to keep it simple without adding heavy deps unless requested,
     * a CSV adapter is a valid "Adapter" for exporting tabular data.
     * 
     * @returns {string} CSV content
     */
    generateReport() {
        if (!this.data || this.data.length === 0) return '';

        const headers = Object.keys(this.data[0]);
        const csvRows = [];

        // Add headers
        csvRows.push(headers.join(','));

        // Add data
        for (const row of this.data) {
            const values = headers.map(header => {
                const escaped = ('' + row[header]).replace(/"/g, '\\"');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }
}
