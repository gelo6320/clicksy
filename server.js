// server.js
require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const moment = require('moment');
const pool = require('./config/db');

// Rotte
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser(process.env.SECRET_KEY));

// Rotte
app.use('/', indexRoutes);
app.use('/admin', adminRoutes);

// Usa la porta assegnata da Railway o, in locale, 3000 come fallback
const PORT = process.env.PORT || 3000;

// Avvio server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
