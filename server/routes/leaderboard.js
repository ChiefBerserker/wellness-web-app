import express from 'express';
import db from '../db/database.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5; // default 5
    if (limit < 1 || limit > 100) return res.status(400).json({ error: 'Invalid limit' });

    const stmt = db.prepare(`
      SELECT 
        c.name AS company, 
        COALESCE(SUM(g.points), 0) AS totalPoints
      FROM users u
      JOIN company c ON u.company_id = c.id
      LEFT JOIN user_progress up ON up.user_id = u.id
      LEFT JOIN goals g ON up.goal_id = g.id
      GROUP BY c.name
      ORDER BY totalPoints DESC
      LIMIT ?
    `);

    const rows = stmt.all([limit]);

    const leaderboard = rows.map((row, idx) => ({
      rank: idx + 1,
      company: row.company,
      score: row.totalPoints,
    }));

    res.json(leaderboard);
  } catch (err) {
    console.error('Error fetching leaderboard', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
