import Database from 'better-sqlite3';

const db = new Database('./matra.db');

// Create or alter users table with extra columns
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    points INTEGER DEFAULT 0
  )
`).run();

// In case the users table exists but is missing columns, add them
try {
  db.prepare(`ALTER TABLE users ADD COLUMN name TEXT`).run();
} catch (e) {
  // Ignore if column already exists
}
try {
  db.prepare(`ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0`).run();
} catch (e) {
  // Ignore if column already exists
}

// Create goals table with frequency column (daily or weekly)
db.prepare(`
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    points INTEGER NOT NULL DEFAULT 1,
    frequency TEXT NOT NULL DEFAULT 'daily'  -- NEW COLUMN
  )
`).run();

// Create user_progress table
db.prepare(`
  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    goal_id INTEGER NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(goal_id) REFERENCES goals(id)
  )
`).run();

// Create unique index to prevent duplicate completions
try {
  db.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_goal ON user_progress(user_id, goal_id)
  `).run();
} catch (e) {
  // Ignore if index already exists
}

export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function createUser(name, email, hashedPassword) {
  const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
  return stmt.run(name, email, hashedPassword);
}

// Update getAllGoals to optionally filter by frequency
export function getAllGoals(frequency = null) {
  if (frequency) {
    return db.prepare('SELECT * FROM goals WHERE frequency = ?').all(frequency);
  }
  return db.prepare('SELECT * FROM goals').all();
}

export function markGoalCompleted(userId, goalId) {
  const checkCompleted = db.prepare(`
    SELECT 1 FROM user_progress WHERE user_id = ? AND goal_id = ?
  `);
  const insertProgress = db.prepare(`
    INSERT INTO user_progress (user_id, goal_id) VALUES (?, ?)
  `);
  const getGoalPoints = db.prepare('SELECT points FROM goals WHERE id = ?');
  const updateUserPoints = db.prepare(`
    UPDATE users SET points = points + ? WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    // Check if already completed
    const alreadyCompleted = checkCompleted.get(userId, goalId);
    if (alreadyCompleted) {
      throw new Error('Goal already completed');
    }
    // Insert progress and update points
    insertProgress.run(userId, goalId);
    const goal = getGoalPoints.get(goalId);
    if (!goal) throw new Error('Goal not found');
    updateUserPoints.run(goal.points, userId);
  });

  return transaction();
}

export function getUserScore(userId) {
  return db.prepare(`
    SELECT COALESCE(SUM(g.points), 0) as totalPoints
    FROM user_progress up
    JOIN goals g ON up.goal_id = g.id
    WHERE up.user_id = ?
  `).get(userId);
}

export function getLeaderboard() {
  return db.prepare(`
    SELECT 
      u.id AS userId,
      u.name, 
      u.email,
      COALESCE(SUM(g.points), 0) AS totalPoints
    FROM user_progress up
    JOIN goals g ON up.goal_id = g.id
    JOIN users u ON up.user_id = u.id
    GROUP BY u.id
    ORDER BY totalPoints DESC
    LIMIT 10
  `).all();
}
// Seed demo users (with names)
const users = [
  { email: 'alice@example.com', password: 'hashedpassword1', name: 'Alice' },
  { email: 'bob@example.com', password: 'hashedpassword2', name: 'Bob' },
  { email: 'carol@example.com', password: 'hashedpassword3', name: 'Carol' }
];

users.forEach(user => {
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(user.email);
  if (!exists) {
    db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)').run(user.email, user.password, user.name);
  }
});

// Seed demo goals with frequency included
const goals = [
  { name: 'Complete Profile', description: 'Fill out your profile information', points: 5, frequency: 'daily' },
  { name: 'First Login', description: 'Login for the first time', points: 2, frequency: 'daily' },
  { name: 'Connect with a Friend', description: 'Add one friend to your network', points: 3, frequency: 'weekly' },  // Weekly example
  { name: 'Daily Login Streak', description: 'Login for 5 consecutive days', points: 10, frequency: 'daily' }
];

goals.forEach(goal => {
  const exists = db.prepare('SELECT 1 FROM goals WHERE name = ?').get(goal.name);
  if (!exists) {
    db.prepare('INSERT INTO goals (name, description, points, frequency) VALUES (?, ?, ?, ?)').run(goal.name, goal.description, goal.points, goal.frequency);
  }
});

// Mark some demo user progress (if not already marked)
const alice = db.prepare('SELECT id FROM users WHERE email = ?').get('alice@example.com');
const bob = db.prepare('SELECT id FROM users WHERE email = ?').get('bob@example.com');
const goalProfile = db.prepare('SELECT id FROM goals WHERE name = ?').get('Complete Profile');
const goalLogin = db.prepare('SELECT id FROM goals WHERE name = ?').get('First Login');

function markIfNotCompleted(userId, goalId) {
  const exists = db.prepare('SELECT 1 FROM user_progress WHERE user_id = ? AND goal_id = ?').get(userId, goalId);
  if (!exists) {
    db.prepare('INSERT INTO user_progress (user_id, goal_id) VALUES (?, ?)').run(userId, goalId);
  }
}

markIfNotCompleted(alice.id, goalProfile.id);
markIfNotCompleted(alice.id, goalLogin.id);
markIfNotCompleted(bob.id, goalLogin.id);

export default db;
