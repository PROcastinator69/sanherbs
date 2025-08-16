// models/User.js

const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DB_PATH || './database/greentap.db';

// User model class for SQLite
class User {
    constructor({ id, name, email, password, created_at }) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.created_at = created_at;
    }

    // Hash password before saving
    static async hashPassword(plainPassword) {
        const saltRounds = 12;
        return await bcrypt.hash(plainPassword, saltRounds);
    }

    // Compare entered password with hashed
    static async comparePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    // Save new user in database
    static async create({ name, email, password }) {
        const hashed = await User.hashPassword(password);
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            const stmt = db.prepare(
                `INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, DATETIME('now'))`
            );
            stmt.run([name, email, hashed], function (err) {
                db.close();
                if (err) return reject(err);
                resolve({ id: this.lastID, name, email, created_at: new Date().toISOString() });
            });
        });
    }

    // Find user by email
    static async findByEmail(email) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            db.get(
                `SELECT id, name, email, password, created_at FROM users WHERE email = ?`,
                [email],
                (err, row) => {
                    db.close();
                    if (err) return reject(err);
                    if (!row) return resolve(null);
                    resolve(new User(row));
                }
            );
        });
    }

    // Additional helper: Find user by ID
    static async findById(id) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath);
            db.get(
                `SELECT id, name, email, password, created_at FROM users WHERE id = ?`,
                [id],
                (err, row) => {
                    db.close();
                    if (err) return reject(err);
                    if (!row) return resolve(null);
                    resolve(new User(row));
                }
            );
        });
    }
}

module.exports = User;
