import express from 'express';
import bcrypt from 'bcrypt';
import { getUserByEmail, createUser } from '../db/database.js';
import path from 'path';
import { isAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();
const SALT_ROUNDS = 10;


//Admin route
router.get('/admin', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/admin.html'));
});
// Protected API routes namespace
router.use('/admin/api', isAdmin);  // Apply isAdmin to all /admin/api/* routes

// Example API route
router.get('/admin/api/employees', (req, res) => {
  // your employee data response here
  res.json(/* employees data */);
});

router.get('/admin/api/stats', (req, res) => {
  // your stats data here
  res.json(/* stats data */);
});

// Signup route
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password required' });
  }

  const existingUser = getUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser(name, email, hashedPassword);

    const newUser = getUserByEmail(email);

    req.session.user = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role || 'user'
    };

    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Session error' });
      }
      res.status(201).json({ message: 'User created', redirect: '/dashboard' });
    });
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

    req.session.user = { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role // 'admin' or 'user'
    };

    // Send redirect URL based on role
    res.json({ success: true, redirect: user.role === 'admin' ? '/admin' : '/dashboard' });
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
