const express = require('express');
const cors = require('cors');
const imaps = require('imap-simple');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Correos autorizados
const autorizados = ['alojatu2024@gmail.com', 'eddnis2025@gmail.com'];

app.get('/verificar', async (req, res) => {
    const email = req.query.email;

    if (!email || !autorizados.includes(email)) {
        return res.status(403).json({ error: 'Correo no autorizado.' });
    }

    // Validar configuración
    const config = {
        imap: {
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASS,
            host: process.env.IMAP_HOST,
            port: Number(process.env.IMAP_PORT),
            tls: process.env.IMAP_TLS?.toLowerCase() === 'true',
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    if (!config.imap.user || !config.imap.password || !config.imap.host || !config.imap.port) {
        return res.status(500).json({ error: 'Falta configuración de entorno.' });
    }

    try {
        console.log('Conectando al correo IMAP...');
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const delay = 24 * 3600 * 1000; // Últimas 24h
        const searchCriteria = ['ALL', ['SINCE', new Date(Date.now() - delay).toISOString()]];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', 'TEXT.HTML'],
            markSeen: false
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        const targetEmail = messages.reverse().find(msg => {
            const headers = msg.parts.find(p => p.which === 'HEADER')?.body || {};
            const from = headers.from?.[0] || '';
            const subject = headers.subject?.[0] || '';
            return (
                from.toLowerCase().includes('info@account.netflix.com') &&
                subject.toLowerCase().includes('código')
            );
        });

        if (!targetEmail) {
            return res.status(404).json({ error: 'No se encontró ningún correo relevante.' });
        }

        const htmlPart = targetEmail.parts.find(p => p.which === 'TEXT.HTML')?.body || '';
        const textPart = targetEmail.parts.find(p => p.which === 'TEXT')?.body || '';

        const codeRegex = /\b\d{4,8}\b/;
        const linkRegex = /https?:\/\/[^\s"]+/;

        const foundCode = codeRegex.exec(textPart) || codeRegex.exec(htmlPart);
        const foundLink = linkRegex.exec(textPart) || linkRegex.exec(htmlPart);

        return res.json({
            codigo: foundCode ? foundCode[0] : null,
            enlace: foundLink ? foundLink[0] : null
        });

    } catch (err) {
        console.error('Error en la conexión IMAP:', err);
        return res.status(500).json({ error: 'Fallo al conectar con el correo.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
