import CryptoJS from 'crypto-js';

// Usamos una llave fuerte desde el .env, si no hay, fallback seguro temporal para no tronar la app
const SECRET_KEY = process.env.SMTP_ENCRYPTION_KEY || 'Fl0wB@rb3r_T3mp0ral_S3cUr1ty_K3y!2026';

/**
 * Encripta un string de texto plano.
 * @param {string} text - El texto a encriptar, por ejemplo la contraseña SMTP.
 * @returns {string} Texto cifrado en AES.
 */
export const encrypt = (text) => {
    if (!text) return text;
    // Se cifra utilizando AES
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

/**
 * Desencripta un string cifrado.
 * @param {string} cipherText - El texto cifrado extraído de la BD.
 * @returns {string} El texto plano original.
 */
export const decrypt = (cipherText) => {
    if (!cipherText) return cipherText;
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText;
    } catch (err) {
        console.error('Error al desencriptar credencial SMTP. Posible discrepancia de llaves.', err);
        return null;
    }
};
