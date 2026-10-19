const express = require('express');
const { login, logout } = require('../controllers/authController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);

module.exports = router;
