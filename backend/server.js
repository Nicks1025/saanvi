require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// --- Environment Validation (Fail Fast) ---
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL ERROR: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const cors = require('cors');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const loginApi = require('./features/login/loginApi');
app.use('/api/login', loginApi);

const userApi = require('./features/user/userApi');
app.use('/api/users', userApi);

const wordSearchApi = require('./features/wordSearch/wordSearchApi');
app.use('/api/games/word-search', wordSearchApi);

// Serve translations
app.use('/api/locales', express.static(path.join(__dirname, 'language')));

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend Server is running with valid configuration.' });
});

const PORT = process.env.BACKEND_PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
