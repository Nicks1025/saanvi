const express = require('express');
const router = express.Router();

// Dependency Injection
const LoginRepository = require('./loginRepository');
const LoginService = require('./loginService');
const LoginController = require('./loginController');

const repository = new LoginRepository();
const service = new LoginService(repository);
const controller = new LoginController(service);

// POST /api/login
router.post('/', (req, res) => controller.login(req, res));

// POST /api/login/google
router.post('/google', (req, res) => controller.googleLogin(req, res));

module.exports = router;
