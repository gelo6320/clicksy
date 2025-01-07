// routes/admin.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const moment = require('moment');

// Middleware (opzionale) per proteggere la route admin con password
// router.use((req, res, next) => {
//   const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
//   if (adminKey === 'SUPERSEGRETO') {
//     next();
//   } else {
//     return res.status(403).send('Accesso negato');
//   }
// });

router.get('/', async (req, res) => {
  try {
    // Preleviamo impostazioni del sito
    const settingsRes = await pool.query(`SELECT * FROM site_settings LIMIT 1`);
    let settings = settingsRes.rows[0];
    if (!settings) {
      // Se non ci sono impostazioni, creiamole di default
      const insert = await pool.query(`
        INSERT INTO site_settings (button_text, button_color, background_color)
        VALUES ('Ritira 100€', '#00AA00', '#FFFFFF')
        RETURNING *
      `);
      settings = insert.rows[0];
    }

    // Preleviamo la classifica referral
    const leaderboardRes = await pool.query(`
      SELECT email, referral_count
      FROM users
      WHERE referral_count > 0
      ORDER BY referral_count DESC
      LIMIT 20
    `);

    res.render('admin', {
      settings,
      leaderboard: leaderboardRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore interno');
  }
});

router.post('/save-settings', async (req, res) => {
  try {
    const { buttonText, buttonColor, backgroundColor, backgroundImage, extraSections } = req.body;
    // Salviamo su DB
    // Assumiamo che esista sempre la riga con id=1 in site_settings
    await pool.query(`
      UPDATE site_settings
      SET button_text = $1,
          button_color = $2,
          background_color = $3,
          background_image = $4,
          extra_sections = $5
      WHERE id = 1
    `, [buttonText, buttonColor, backgroundColor, backgroundImage, extraSections]);

    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore interno');
  }
});

// Generazione ref link personalizzato per un utente specifico (es. email)
router.post('/generate-ref', async (req, res) => {
  try {
    const { email } = req.body;
    // Cerchiamo l'utente con quell'email
    const userRes = await pool.query(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).send('Utente non trovato');
    }
    const user = userRes.rows[0];
    // Il ref link sarà ad es. /?ref=<user_hash>
    const refLink = `${req.protocol}://${req.get('host')}/?ref=${user.user_hash}`;
    res.send(`Ref link per ${email}: ${refLink}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore interno');
  }
});

module.exports = router;