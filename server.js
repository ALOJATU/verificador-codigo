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

    const config = {
        imap: {
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASS,
            host: process.env.IMAP_HOST,
            port: parseInt(process.env.IMAP_PORT, 10),
            tls: process.env.IMAP_TLS?.toLowerCase() === 'true',
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        console.log('Conectando al correo IMAP...');
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const delay = 24 * 3600 * 1000;
        const searchCriteria = ['ALL', ['SINCE', new Date(Date.now() - delay).toISOString()]];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', 'TEXT.HTML'],
            markSeen: false
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        const targetEmail = messages.reverse().find(msg => {
            const headers = msg.parts.find(p => p.which === 'HEADER').body;
            const from = headers.from ? headers.from[0] : '';
            const subject = headers.subject ? headers.subject[0] : '';
            return (
                from.toLowerCase().includes('info@account.netflix.com') ||
                from.toLowerCase().includes('eddnis2025@gmail.com') // Ejemplo
            ) && (subject.toLowerCase().includes('código') || subject.toLowerCase().includes('codigo'));
        });

        if (!targetEmail) {
            return res.status(404).json({ error: 'No se encontró ningún correo de verificación.' });
        }

        const textBody = targetEmail.parts.find(p => p.which === 'TEXT')?.body || '';
        const htmlBody = targetEmail.parts.find(p => p.which === 'TEXT.HTML')?.body || '';

        // Buscar código en texto plano
        const codeMatch = textBody.match(/\b\d{4,8}\b/);
        if (codeMatch) {
            return res.json({ tipo: 'codigo', valor: codeMatch[0] });
        }

        // Buscar botón "Obtener código" en HTML
        const cleanHtml = htmlBody.replace(/\s+/g, ' ');
        const linkMatch = cleanHtml.match(/href="([^"]+)"[^>]*>\s*Obtener código/i);
        if (linkMatch) {
            return res.json({ tipo: 'enlace', valor: linkMatch[1] });
        }

        return res.status(404).json({ error: 'No se encontró ningún código ni enlace.' });

    } catch (error) {
        console.error('❌ Error al conectar o leer el correo:', error);
        return res.status(500).json({ error: 'Error del servidor al conectar al correo.' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor activo en http://localhost:${PORT}`);
});
