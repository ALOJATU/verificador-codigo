
const express = require('express');
const cors = require('cors');
const imaps = require('imap-simple');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const autorizados = ['eddnis2025@gmail.com', 'alojatu2024@gmail.com'];

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
            port: parseInt(process.env.IMAP_PORT),
            tls: true,
            tlsOptions: {
                rejectUnauthorized: false
            },
            authTimeout: 3000
        }
    };

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const delay = 24 * 3600 * 1000;
        let searchCriteria = ['ALL', ['SINCE', new Date(Date.now() - delay).toISOString()]];
        let fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        const netflix = messages.reverse().find(msg => {
            const headers = msg.parts.find(p => p.which === 'HEADER').body;
            const subject = headers.subject ? headers.subject[0] : '';
            return subject.toLowerCase().includes('código') || subject.toLowerCase().includes('codigo');
        });

        if (!netflix) {
            return res.status(404).json({ error: 'No se encontró ningún correo de verificación.' });
        }

        const body = netflix.parts.find(p => p.which === 'TEXT').body;
        const codeMatch = body.match(/\b\d{4,8}\b/);

        if (codeMatch) {
            res.json({ codigo: codeMatch[0] });
        } else {
            res.status(404).json({ error: 'No se encontró código en el correo.' });
        }

    } catch (error) {
        console.error('Error al conectar o leer el correo:', error);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
