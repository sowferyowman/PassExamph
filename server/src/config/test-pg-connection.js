const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { pool } = require("./database.pg");

async function main() {
  try {
    const nowResult = await pool.query("SELECT NOW() AS now");
    const usersResult = await pool.query("SELECT COUNT(*) AS count FROM users");

    console.log(`SELECT NOW(): ${nowResult.rows[0].now.toISOString()}`);
    console.log(`SELECT COUNT(*) FROM users: ${usersResult.rows[0].count}`);
  } catch (error) {
    console.error("PostgreSQL connection test failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
