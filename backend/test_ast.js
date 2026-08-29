const { parse } = require('pgsql-ast-parser');

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
    const ast = parse(q);
    console.log(`\nQuery: ${q}`);
    console.log(JSON.stringify(ast, null, 2));
  } catch (e) {
    console.error(e.message);
  }
});
