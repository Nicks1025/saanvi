const QueryHelper = require('./database/queryHelper');
const SqlService = require('./features/admin/sqlService');

const sqlService = new SqlService(new QueryHelper());

const queries = [
  "ALTER TABLE users ADD COLUMN age INT;",
  "DELETE FROM users;",
  "DELETE FROM users WHERE 1=1;",
  "UPDATE users SET name='test';",
  "UPDATE users SET name='test' WHERE 1 = 1;",
  "UPDATE users SET name='test' WHERE id = 1;",
];

queries.forEach(q => {
  try {
    sqlService._validateAstSafety(q);
    console.log(`\nQuery: ${q}\nStatus: PASS`);
  } catch (e) {
    console.log(`\nQuery: ${q}\nStatus: BLOCKED -> ${e.message}`);
  }
});
