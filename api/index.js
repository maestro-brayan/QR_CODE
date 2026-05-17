const express  = require('express');
const multer   = require('multer');
const qrcode   = require('qrcode');
const path     = require('path');
const { put }  = require('@vercel/blob');
const { applyWatermark } = require('./watermark');

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

/* ── Upload + filigrane + QR Code ── */
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Pas de fichier' });

        // Appliquer le filigrane (paramètres fixés dans watermark.js)
        const pdfBuffer = await applyWatermark(req.file.buffer);

        // Nom unique
        const now      = new Date();
        const mm       = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy     = now.getFullYear();
        const baseName = req.file.originalname.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_');
        const suffix   = Date.now().toString(36).slice(-4);
        const fileName = `CI-ABJ-${mm}-${yyyy}-${baseName}-${suffix}.pdf`;

        // Upload Vercel Blob
        const blob = await put(fileName, pdfBuffer, {
            access: 'public',
            contentType: 'application/pdf',
            addRandomSuffix: false,
        });

        // Lien court via notre proxy
        const host     = req.get('host');
        const blobName = blob.url.split('/').pop();
        const viewUrl  = `https://${host}/lib/pdfjs/web/viewer.html?file=/api/files/${blobName}`;

        // QR Code noir sur blanc
        const qrImage = await qrcode.toDataURL(viewUrl, {
            color: { dark: '#000000', light: '#ffffff' },
            width: 300,
            margin: 2,
        });

        res.json({ success: true, qrImage, viewerUrl: viewUrl });

    } catch (err) {
        console.error('Erreur upload:', err);
        res.status(500).json({ error: err.message });
    }
});

/* ── Proxy fichier blob ── */
app.get('/api/files/:filename', (req, res) => {
    res.redirect(`https://abeppcqgq6rabilm.public.blob.vercel-storage.com/${req.params.filename}`);
});

module.exports = app;