const express = require('express');
const multer = require('multer');
const qrcode = require('qrcode');
const path = require('path');
const { put } = require('@vercel/blob');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

app.post('/api/upload', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Pas de fichier' });

        const maintenant = new Date();
        const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
        const annee = maintenant.getFullYear();
        
        const nomNettoye = req.file.originalname
            .replace(/\.[^/.]+$/, "") 
            .replace(/[^a-z0-9]/gi, '_'); 

        // 1. GÉNÉRATION DU SUFFIXE D'UNE SEULE LETTRE (Base 36)
        const suffixeCourt = Date.now().toString(36).slice(-1); 
        const nomFichierUnique = `CI-ABJ-${mois}-${annee}-${nomNettoye}-${suffixeCourt}.pdf`;

        // 2. UPLOAD VERS VERCEL BLOB (addRandomSuffix: false pour garder le nom court)
        const blob = await put(nomFichierUnique, req.file.buffer, {
            access: 'public',
            contentType: 'application/pdf',
            addRandomSuffix: false 
        });

        const host = req.get('host');
        const fileName = blob.url.split('/').pop();

        // 3. CONSTRUCTION DU LIEN ULTRA-COURT (Une seule ligne)
        // Remplacez l'ancienne ligne shortUrl par celle-ci :
const shortUrl = `https://${host}/lib/pdfjs/web/viewer.html?file=/api/files/${fileName}`;

        const qrImage = await qrcode.toDataURL(shortUrl, {
            color: { dark: '#f39c12', light: '#ffffff' },
            width: 300
        });

        res.json({
            success: true,
            qrImage: qrImage,
            viewerUrl: shortUrl
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Cette fonction permet de lire le fichier depuis le stockage quand on utilise le lien court
app.get('/api/files/:filename', async (req, res) => {
    const { filename } = req.params;
    // Remplacez 'VOTRE_ID_BLOB' par l'ID de votre stockage si nécessaire, 
    // ou utilisez l'URL de base de votre bucket Vercel
    const blobUrl = `https://abeppcqgq6rabilm.public.blob.vercel-storage.com/${filename}`;
    res.redirect(blobUrl);
});

module.exports = app;