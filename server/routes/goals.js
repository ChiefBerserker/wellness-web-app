import express from 'express';
import db, { getAllGoals, markGoalCompleted, getLeaderboard, getUserScore, getUserByEmail } from '../db/database.js';
const router = express.Router();

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
  if (req.session.user && req.session.user.email) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
}

// Get daily goals
router.get('/daily', isAuthenticated, (req, res) => {
  try {
    const user = getUserByEmail(req.session.user.email);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const goals = getAllGoals();

    const completedRows = db.prepare(`
      SELECT goal_id FROM user_progress WHERE user_id = ?
    `).all(user.id);

    const completedGoalIds = completedRows.map(row => row.goal_id);

    const dailyGoals = goals
      .filter(goal => goal.frequency === 'daily') // 👈 Only daily goals
      .map(goal => ({
        ...goal,
        completed: completedGoalIds.includes(goal.id)
      }));

    res.json(dailyGoals);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching daily goals' });
  }
});

// Get weekly goals
router.get('/weekly', isAuthenticated, (req, res) => {
  try {
    const user = getUserByEmail(req.session.user.email);
    if (!user) return res.status(401).json({ message: 'User not found' });

    // Get all goals
    const goals = getAllGoals();

    // Get list of completed goal IDs for this user
    const completedRows = db.prepare(`
      SELECT goal_id FROM user_progress WHERE user_id = ?
    `).all(user.id);

    const completedGoalIds = completedRows.map(row => row.goal_id);

    // Only weekly goals (assuming you tag them with frequency = 'weekly')
    const weeklyGoals = goals
      .filter(goal => goal.frequency === 'weekly') // 👈 Only weekly goals
      .map(goal => ({
        ...goal,
        completed: completedGoalIds.includes(goal.id)
      }));

    res.json(weeklyGoals);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching weekly goals' });
  }
});

// Mark a goal as completed
router.post('/complete', isAuthenticated, async (req, res) => {
  try {
    const { goalId } = req.body;
    if (!goalId) return res.status(400).json({ message: 'Goal ID is required' });

    const user = await getUserByEmail(req.session.user.email);
    if (!user) return res.status(401).json({ message: 'User not found' });

    await markGoalCompleted(user.id, goalId);

    const score = await getUserScore(user.id);

    res.json({ message: 'Goal marked as completed', score });
  } catch (err) {
    if (err.message === 'Goal already completed') {
      return res.status(409).json({ message: 'Goal already completed' });
    }
    console.error('Error marking goal completed:', err);
    res.status(500).json({ message: 'Error marking goal completed', error: err.message });
  }
});

// Get leaderboard
router.get('/leaderboard', isAuthenticated, (req, res) => {
  try {
    const leaderboard = getLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

export default router;
