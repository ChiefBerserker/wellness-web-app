export function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.is_admin) {
    return next();
  }
  res.status(403).json({ message: 'Forbidden: Admins only' });
}
