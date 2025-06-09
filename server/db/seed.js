import Database from 'better-sqlite3';

const db = new Database('./matra.db');

// --- Seed companies ---
const companies = [
  { name: 'WellCo', sector: 'Wellness', region: 'London', country: 'UK', website: 'https://wellco.example' },
  { name: 'HealthyTech', sector: 'Technology', region: 'Manchester', country: 'UK', website: 'https://healthytech.example' },
  { name: 'FitWorks', sector: 'Fitness', region: 'Bristol', country: 'UK', website: 'https://fitworks.example' },
  { name: 'Mindful Inc.', sector: 'Mental Health', region: 'Leeds', country: 'UK', website: 'https://mindfulinc.example' },
  { name: 'Zenith Wellness', sector: 'Wellness', region: 'Edinburgh', country: 'UK', website: 'https://zenithwellness.example' }
];
companies.forEach(company => {
  const exists = db.prepare('SELECT 1 FROM company WHERE name = ?').get(company.name);
  if (!exists) {
    db.prepare(
      `INSERT INTO company (name, sector, region, country, website) VALUES (?, ?, ?, ?, ?)`
    ).run(company.name, company.sector, company.region, company.country, company.website);
  }
});

// --- Seed users ---
const users = [
  { email: 'alice@example.com', password: 'hashedpassword1', name: 'Alice', companyName: 'TechCorp' },
  { email: 'bob@example.com', password: 'hashedpassword2', name: 'Bob', companyName: 'HealthPlus' },
  { email: 'carol@example.com', password: 'hashedpassword3', name: 'Carol', companyName: 'GreenFoods' }
];

const getCompanyId = name => db.prepare('SELECT id FROM company WHERE name = ?').get(name)?.id;

users.forEach(user => {
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(user.email);
  if (!exists) {
    const companyId = getCompanyId(user.companyName) || null;
    db.prepare('INSERT INTO users (email, password, name, company_id) VALUES (?, ?, ?, ?)').run(user.email, user.password, user.name, companyId);
  } else {
    // Update company if user exists but no company_id
    const currentCompany = db.prepare('SELECT company_id FROM users WHERE email = ?').get(user.email);
    if (!currentCompany.company_id) {
      const companyId = getCompanyId(user.companyName) || null;
      db.prepare('UPDATE users SET company_id = ? WHERE email = ?').run(companyId, user.email);
    }
  }
});

// --- Seed goals ---
const goals = [
  { name: 'Complete Profile', description: 'Fill out your profile information', points: 5, frequency: 'daily' },
  { name: 'First Login', description: 'Login for the first time', points: 2, frequency: 'daily' },
  { name: 'Connect with a Friend', description: 'Add one friend to your network', points: 3, frequency: 'weekly' },
  { name: 'Daily Login Streak', description: 'Login for 5 consecutive days', points: 10, frequency: 'daily' }
];

goals.forEach(goal => {
  const exists = db.prepare('SELECT 1 FROM goals WHERE name = ?').get(goal.name);
  if (!exists) {
    db.prepare('INSERT INTO goals (name, description, points, frequency) VALUES (?, ?, ?, ?)').run(goal.name, goal.description, goal.points, goal.frequency);
  }
});

// --- Seed user progress ---
const getUserId = email => db.prepare('SELECT id FROM users WHERE email = ?').get(email)?.id;
const getGoalId = name => db.prepare('SELECT id FROM goals WHERE name = ?').get(name)?.id;

function markIfNotCompleted(userId, goalId) {
  const exists = db.prepare('SELECT 1 FROM user_progress WHERE user_id = ? AND goal_id = ?').get(userId, goalId);
  if (!exists) {
    db.prepare('INSERT INTO user_progress (user_id, goal_id) VALUES (?, ?)').run(userId, goalId);
    // Also update user points
    const points = db.prepare('SELECT points FROM goals WHERE id = ?').get(goalId)?.points || 0;
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(points, userId);
  }
}

const aliceId = getUserId('alice@example.com');
const bobId = getUserId('bob@example.com');
const carolId = getUserId('carol@example.com');

const goalCompleteProfileId = getGoalId('Complete Profile');
const goalFirstLoginId = getGoalId('First Login');

if (aliceId && goalCompleteProfileId) markIfNotCompleted(aliceId, goalCompleteProfileId);
if (aliceId && goalFirstLoginId) markIfNotCompleted(aliceId, goalFirstLoginId);
if (bobId && goalFirstLoginId) markIfNotCompleted(bobId, goalFirstLoginId);
if (carolId && goalCompleteProfileId) markIfNotCompleted(carolId, goalCompleteProfileId);

console.log('Database seeded: companies, users, goals, and progress linked.');
