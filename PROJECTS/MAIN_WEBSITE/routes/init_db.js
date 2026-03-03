require("dotenv").config();
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function initDB() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL not set");
    return;
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // required for cloud postgres
    },
  });

  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL");

    // Create admin_users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(200) NOT NULL
      )
    `);
    console.log("✔ admin_users table ready");

    // Create bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        package VARCHAR(100) NOT NULL,
        date TIMESTAMP NOT NULL,
        details TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✔ bookings table ready");

    // Create reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        approved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✔ reviews table ready");

    // Check admin user
    const adminCheck = await client.query(
      "SELECT * FROM admin_users WHERE username = $1",
      ["admin"]
    );

    if (adminCheck.rows.length === 0) {
      const password = process.env.ADMIN_PASSWORD || "admin123";
      const passwordHash = await bcrypt.hash(password, 10);

      await client.query(
        "INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)",
        ["admin", passwordHash]
      );

      console.log("✅ Default admin user created");
    } else {
      console.log("ℹ Admin already exists");
    }

    console.log("🎉 Database initialization completed successfully!");
  } catch (error) {
    console.error("❌ Error initializing database:", error.message);
  } finally {
    await client.end();
  }
}

initDB();
