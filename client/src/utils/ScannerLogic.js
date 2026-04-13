/**
 * ScannerLogic.js
 * Módulo para captura de datos provenientes de lectores de códigos de barras (HID - Emulación de teclado),
 * discriminando la entrada veloz de la máquina contra la escritura humana.
 */

export class ScannerLogic {
    /**
     * @param {Object} options
     * @param {number} options.threshold - Umbral en ms entre teclas. Recomendado: 30-50ms
     * @param {string} options.suffix - Tecla que finaliza la ráfaga. Usualmente 'Enter'
     * @param {number} options.minChars - Mínimo de caracteres requeridos para considerarlo un escaneo válido
     * @param {Function} options.onScan - Función callback a ejecutar (code) => {}
     * @param {Function} options.onError - Callback opcional para errores de lectura silenciosos
     */
    constructor(options = {}) {
        this.threshold = options.threshold || 35;
        this.suffix = options.suffix || 'Enter';
        this.minChars = options.minChars || 6;
        this.onScan = options.onScan || null;
        this.onError = options.onError || null;

        this.buffer = '';
        this.lastTime = 0;
        this.isScanning = false;

        // Binding del handler para poder re/moverlo limpiamente
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * Activa el listener local en el DOM
     */
    start() {
        // Escucha en fase de burbujeo/intercepción general
        window.addEventListener('keydown', this.handleKeyDown);
        console.log(`[ScannerLogic] Activo 🔥 (Umbral: ${this.threshold}ms, Cierre: ${this.suffix})`);
    }

    /**
     * Detiene la observación. Fundamental para no dejar en el onUnmount de los frameworks fantasmas
     */
    stop() {
        window.removeEventListener('keydown', this.handleKeyDown);
        this.buffer = '';
        this.isScanning = false;
        console.log(`[ScannerLogic] Detenido 🛑`);
    }

    /**
     * Evento central keydown
     */
    handleKeyDown(e) {
        // Ignorar modificadores y comandos (Ctrl+C, CMD+V, etc.)
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        const currentTime = performance.now();
        const timeDiff = currentTime - this.lastTime;

        // Si el tiempo es mayor que el umbral, significa que el usuario tardó en presionar
        // O fue el primer carácter de alguien escribiendo normalmente. Limpiamos el buffer.
        if (timeDiff > this.threshold && this.lastTime !== 0) {
            this.buffer = '';
            this.isScanning = false;
        }

        this.lastTime = currentTime;

        // Si detecta la tecla Enter (o la tecla Sufijo configurada)
        if (e.key === this.suffix) {
            if (this.buffer.length >= this.minChars) {
                // Es un escaneo real completado
                e.preventDefault(); // Previene envío accidental de formularios.
                e.stopPropagation();

                const code = this.buffer;
                console.log(`[ScannerLogic] Ráfaga Exitosa Capturada: ${code}`);

                if (this.onScan) {
                    this.onScan(code);
                }
            } else if (this.buffer.length > 0) {
                // Posible error o ruido.
                if (this.onError) this.onError(`Ráfaga corta de lectura ignorada (${this.buffer.length} chars)`);
            }

            // Resetea tras un Enter no importando si fue corto o no, porque el buffer ya no sirve
            this.buffer = '';
            this.isScanning = false;
            return;
        }

        // Si la tecla presionada es un caracter estándar (longitud = 1 evita registrar 'Shift', 'Backspace')
        if (e.key.length === 1) {
            this.buffer += e.key;

            // Si llegamos a más de 1-2 caracteres introducidos a velocidad récord,
            // podemos asumir empíricamente que SÍ es un escáner escupiendo texto,
            // por tanto "secuestramos" el evento para evitar que el string
            // contamine el <input> suelto de la interfaz donde el usuario tenga el cursor.
            if (this.buffer.length > 1 && timeDiff <= this.threshold) {
                this.isScanning = true;
                e.preventDefault(); 
            }
        }
    }
}
