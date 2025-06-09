import express from 'express';
import { upsertMoodEntry, getMoodEntry, getMoodHistory } from '../db/database.js'; 

const router = express.Router();

// Middleware to ensure user is logged in (assumes req.session.user)
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /mood/:type
// Example: { moodValue: 3 } where type is 'morning' or 'afternoon'
router.post('/:type', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const moodType = req.params.type; // 'morning' or 'afternoon'
  const { moodValue } = req.body;

  if (!['morning', 'afternoon'].includes(moodType)) {
    return res.status(400).json({ error: 'Invalid mood type' });
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    upsertMoodEntry(userId, today, moodType, moodValue);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to record mood' });
  }
});

// GET /mood/today
router.get('/today', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const today = new Date().toISOString().split('T')[0];
  const entry = getMoodEntry(userId, today);
  res.json(entry || {});
});

// GET /mood/history
router.get('/history', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const history = getMoodHistory(userId);
  res.json(history);
});

export default router;
