import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import authRoutes from './routes/auth.js';
import goalsRoutes from './routes/goals.js';
import adminRoutes from './routes/admin.js';
import moodRoutes from './routes/mood.js';
import leaderboardRoutes from './routes/leaderboard.js';

import { getMoodEntry } from './db/database.js';

import db from './db/database.js';

dotenv.config();



const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));


app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set true if HTTPS
}));

// Serve static files from client folder
app.use(express.static(path.join(__dirname, '../client')));

// Optionally serve public folder under /public if needed
// app.use('/public', express.static(path.join(__dirname, '../public')));

// Routes
app.use('/auth', authRoutes);
app.use('/goals', goalsRoutes);
app.use('/mood', moodRoutes);
app.use('/admin', adminRoutes); 
app.use('/leaderboard', leaderboardRoutes);

// Root route serves main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Session check route
app.get('/me', (req, res) => {
  if (req.session.user && req.session.user.email) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

// Logout
app.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error(err);
        return res.status(500).send('Could not log out.');
      } else {
        return res.redirect('/');
      }
    });
  } else {
    res.redirect('/');
  }
});

// Check if mood entry exists for today
app.get('/mood/check-today', (req, res) => {
  try {
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // getMoodEntry is synchronous in better-sqlite3, no need for await
    const entry = getMoodEntry(userId, today);

    res.json({ moodLogged: !!entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.use('/api/leaderboard', leaderboardRoutes);


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
