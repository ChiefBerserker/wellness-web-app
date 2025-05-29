import express from 'express';
import bcrypt from 'bcrypt';
import { getUserByEmail, createUser } from '../db/database.js';

const router = express.Router();
const SALT_ROUNDS = 10;

// Signup route
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;  // <-- Add name here
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password required' });
  }

  const existingUser = getUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    createUser(name, email, hashedPassword);  // <-- Pass name to createUser
    req.session.user = { name, email };       // <-- Save name in session for later use
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    req.session.user = { id: user.id, name: user.name, email: user.email };
    res.json({ success: true, name: user.name, email: user.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

export default router;
