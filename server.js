
require("dotenv").config();
const express = require("express");
const imaps = require("imap-simple");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());

const config = {
  imap: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT),
    tls: true,
    authTimeout: 5000
  }
};

app.post("/api/verificar", async (req, res) => {
  const { email, code } = req.body;

  try {
    const connection = await imaps.connect({ imap: config.imap });
    await connection.openBox("INBOX");

    const messages = await connection.search(["UNSEEN", ["SINCE", new Date()]], {
      bodies: ["TEXT"],
      markSeen: false
    });

    let encontrado = false;

    for (const m of messages) {
      const cuerpo = m.parts.find(p => p.which === "TEXT").body;
      if (cuerpo.includes(code)) {
        encontrado = true;
        break;
      }
    }

    connection.end();
    res.json({ mensaje: encontrado ? "✅ Código válido." : "❌ Código no encontrado." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al acceder al correo." });
  }
});

app.listen(3000, () => console.log("Servidor activo en http://localhost:3000"));
