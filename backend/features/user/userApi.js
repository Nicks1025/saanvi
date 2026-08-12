const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../base/authMiddleware');

const QueryHelper = require('../../database/queryHelper');
const UserRepository = require('./userRepository');
const UserService = require('./userService');
const UserController = require('./userController');

const queryHelper = new QueryHelper();
const userRepository = new UserRepository(queryHelper);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Protected routes
router.use(verifyToken);

router.get('/me', (req, res) => userController.getMe(req, res));
router.put('/me/settings', (req, res) => userController.updateSettings(req, res));

module.exports = router;
