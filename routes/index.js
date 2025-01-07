// routes/index.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

// Array in memoria per le vincite fittizie (uguali per tutti)
let fakeWinners = [];

// Funzione che genera una vincita fittizia
function generateFakeWinner() {
  const names = ['Mario', 'Lucia', 'Gianni', 'Sara', 'Roberto', 'Elena', 'Marco', 'Anna'];
  const randomName = names[Math.floor(Math.random() * names.length)];
  const amount = 100; // o se vuoi random
  const time = moment().format('HH:mm:ss');
  return {
    name: randomName,
    amount: amount,
    time: time
  };
}

// Ogni 10 secondi aggiungiamo una vincita fittizia in testa all'array
setInterval(() => {
  const newWinner = generateFakeWinner();
  // Aggiungiamo in cima
  fakeWinners.unshift(newWinner);
  // Se vuoi tenerne solo un tot, ad es. 50
  if (fakeWinners.length > 50) {
    fakeWinners.pop();
  }
}, 10000);

// Middleware per identificare/creare utente via cookie
router.use(async (req, res, next) => {
  try {
    let userHash = req.cookies.user_hash;
    let invitedBy = null;

    // Se c'è un query param "ref", significa che siamo arrivati tramite un referral link
    if (req.query.ref) {
      invitedBy = req.query.ref; 
    }

    // Se non abbiamo un cookie user_hash, ne creiamo uno
    if (!userHash) {
      userHash = uuidv4(); // genera un id univoco
      res.cookie('user_hash', userHash, { maxAge: 365 * 24 * 60 * 60 * 1000 }); // 1 anno
      // Inseriamo nel DB un nuovo utente
      const personalRefCode = uuidv4();
      await pool.query(
        `INSERT INTO users (user_hash, personal_ref_code, invited_by) VALUES ($1, $2, $3)`,
        [userHash, personalRefCode, invitedBy]
      );
    } else {
      // Se già esiste, controlliamo se esiste nel DB, altrimenti lo creiamo
      const result = await pool.query(`SELECT * FROM users WHERE user_hash = $1`, [userHash]);
      if (result.rows.length === 0) {
        const personalRefCode = uuidv4();
        await pool.query(
          `INSERT INTO users (user_hash, personal_ref_code, invited_by) VALUES ($1, $2, $3)`,
          [userHash, personalRefCode, invitedBy]
        );
      }
    }

    req.userHash = userHash;
    next();
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// GET homepage
router.get('/', async (req, res) => {
  try {
    // Recuperiamo i dati dell'utente
    const { rows } = await pool.query(`SELECT * FROM users WHERE user_hash = $1`, [req.userHash]);
    const user = rows[0];

    // Verifichiamo se il timer è scaduto
    let canClick = true;  // se può cliccare
    let remainingTime = 0;

    if (user.timer_end) {
      const now = moment();
      const timerEnd = moment(user.timer_end);
      if (now.isBefore(timerEnd)) {
        // timer non ancora scaduto
        canClick = false;
        remainingTime = timerEnd.diff(now, 'seconds'); 
      }
    }

    // Preleviamo la sezione "vincite fittizie": le ultime N
    const winnersToShow = fakeWinners; // usiamo direttamente l'array in memoria

    // Render della pagina
    res.render('index', {
      user,
      canClick,
      remainingTime,
      winnersToShow
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore interno');
  }
});

// POST per gestire il click sul pulsante
router.post('/click', async (req, res) => {
  try {
    // Recuperiamo l'utente dal DB
    const { rows } = await pool.query(`SELECT * FROM users WHERE user_hash = $1`, [req.userHash]);
    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Utente non trovato' });
    }

    // Se l'utente ha già un timer attivo e non è scaduto, non può cliccare
    const now = moment();
    let timerEnd = user.timer_end ? moment(user.timer_end) : null;
    if (timerEnd && now.isBefore(timerEnd)) {
      return res.status(400).json({ error: 'Timer non ancora scaduto' });
    }

    // Calcoliamo la durata del timer (default 24 ore)
    // Ma se l'utente è stato invitato e non ha mai cliccato, la prima volta 10 ore
    let hoursToAdd = 24;
    // Se invited_by non è null e last_click è null => 10 ore
    if (user.invited_by && !user.last_click) {
      hoursToAdd = 10;
    }

    // Impostiamo il nuovo timer
    const newTimerEnd = moment().add(hoursToAdd, 'hours');

    // Aggiorniamo last_click e timer_end
    await pool.query(
      `UPDATE users SET last_click = $1, timer_end = $2 WHERE id = $3`,
      [now.format(), newTimerEnd.format(), user.id]
    );

    // Se l'utente era stato invitato, allora riduciamo di 6 ore il timer di chi ha invitato,
    // ma solo se non lo abbiamo già fatto prima.
    // L'idea: lo facciamo la PRIMA volta che l'utente invitato clicca.
    // Quindi controlliamo se user.last_click era NULL e user.invited_by esiste.
    if (user.invited_by && !user.last_click) {
      // recuperiamo colui che ha inviato
      const inviterRes = await pool.query(`SELECT * FROM users WHERE user_hash = $1`, [user.invited_by]);
      const inviter = inviterRes.rows[0];
      if (inviter) {
        // se l'inviter ha un timer in corso lo riduciamo di 6 ore
        if (inviter.timer_end) {
          const inviterTimerEnd = moment(inviter.timer_end);
          if (now.isBefore(inviterTimerEnd)) {
            // riduciamo 6 ore
            const updatedInviterEnd = inviterTimerEnd.subtract(6, 'hours');
            await pool.query(
              `UPDATE users SET timer_end = $1, referral_count = referral_count + 1 WHERE id = $2`,
              [updatedInviterEnd.format(), inviter.id]
            );
          } else {
            // se il timer è già scaduto, non c'è nulla da sottrarre, ma incrementiamo i referral
            await pool.query(
              `UPDATE users SET referral_count = referral_count + 1 WHERE id = $1`,
              [inviter.id]
            );
          }
        }
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore interno' });
  }
});

// POST per salvare/aggiornare l'email dell'utente
router.post('/save-email', async (req, res) => {
  try {
    const email = req.body.email;
    if (!email) {
      return res.status(400).json({ error: 'Email non valida' });
    }

    const { rows } = await pool.query(`SELECT * FROM users WHERE user_hash = $1`, [req.userHash]);
    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Utente non trovato' });
    }

    // Aggiorniamo l'email in DB
    await pool.query(`UPDATE users SET email = $1 WHERE id = $2`, [email, user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore interno' });
  }
});

module.exports = router;