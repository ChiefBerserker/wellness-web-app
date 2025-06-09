import express from 'express';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { listCompanies, getLeaderboard, getUserByEmail, getCompanyById } from '../db/database.js'; // Adjust path
const router = express.Router();

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
};

const setUserFromSession = (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
};

// Serve admin page (HTML UI)
router.get('/',setUserFromSession, isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/admin.html'));
});

// Admin API: List all companies
router.get('/admin/api/companies', isAdmin, (req, res) => {
  try {
    const companies = listCompanies();
    res.json(companies);
  } catch (error) {
    console.error('Failed to fetch companies', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin API: Get leaderboard (top users with points and company info)
router.get('/admin/api/leaderboard', isAdmin, (req, res) => {
  try {
    const leaderboard = getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    console.error('Failed to fetch leaderboard', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin API: Get detailed user info by email (for search)
router.get('/admin/api/user/:email', isAdmin, (req, res) => {
  try {
    const email = req.params.email;
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // You could add more detailed queries here (moods, progress, etc.)
    res.json(user);
  } catch (error) {
    console.error('Failed to fetch user', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin API: Get company by id (detailed info)
router.get('/admin/api/company/:id', isAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const company = getCompanyById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    console.error('Failed to fetch company', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
