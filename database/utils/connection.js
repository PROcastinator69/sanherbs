const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const CONSTANTS = require('./constants');

class DatabaseConnection {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DB_PATH || path.join(__dirname, '../greentap.db');
        this.isConnected = false;
    }

    // Initialize database connection
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                // Ensure database directory exists
                const dbDir = path.dirname(this.dbPath);
                if (!fs.existsSync(dbDir)) {
                    fs.mkdirSync(dbDir, { recursive: true });
                }

                this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                    if (err) {
                        console.error('Database connection error:', err.message);
                        reject(err);
                    } else {
                        console.log('✅ Connected to SQLite database:', this.dbPath);
                        this.isConnected = true;
                        this.setupDatabase();
                        resolve(this.db);
                    }
                });

                // Enable foreign key constraints
                this.db.run('PRAGMA foreign_keys = ON');

                // Optimize SQLite performance
                this.db.run('PRAGMA journal_mode = WAL');
                this.db.run('PRAGMA synchronous = NORMAL');
                this.db.run('PRAGMA temp_store = MEMORY');
                this.db.run('PRAGMA mmap_size = 268435456'); // 256MB

            } catch (error) {
                console.error('Database connection setup error:', error);
                reject(error);
            }
        });
    }

    // Setup database with utility methods
    setupDatabase() {
        // Add promise-based methods to database instance
        this.db.runAsync = (sql, params = []) => {
            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ 
                            id: this.lastID, 
                            changes: this.changes 
                        });
                    }
                });
            });
        };

        this.db.getAsync = (sql, params = []) => {
            return new Promise((resolve, reject) => {
                this.db.get(sql, params, (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });
        };

        this.db.allAsync = (sql, params = []) => {
            return new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
        };

        // Add prepared statement helper
        this.db.prepareAsync = (sql) => {
            const stmt = this.db.prepare(sql);
            return {
                run: (params = []) => {
                    return new Promise((resolve, reject) => {
                        stmt.run(params, function(err) {
                            if (err) reject(err);
                            else resolve({ id: this.lastID, changes: this.changes });
                        });
                    });
                },
                get: (params = []) => {
                    return new Promise((resolve, reject) => {
                        stmt.get(params, (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });
                },
                all: (params = []) => {
                    return new Promise((resolve, reject) => {
                        stmt.all(params, (err, rows) => {
                            if (err) reject(err);
                            else resolve(rows);
                        });
                    });
                },
                finalize: () => {
                    return new Promise((resolve, reject) => {
                        stmt.finalize((err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                }
            };
        };
    }

    // Run migrations
    async runMigrations() {
        try {
            const migrationsDir = path.join(__dirname, '../migrations');
            
            if (!fs.existsSync(migrationsDir)) {
                console.warn('⚠️  Migrations directory not found:', migrationsDir);
                return;
            }

            const migrationFiles = fs.readdirSync(migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();

            console.log('🔄 Running database migrations...');

            for (const file of migrationFiles) {
                console.log(`📄 Running migration: ${file}`);
                const migrationPath = path.join(migrationsDir, file);
                const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
                
                // Split SQL into individual statements
                const statements = migrationSQL
                    .split(';')
                    .map(stmt => stmt.trim())
                    .filter(stmt => stmt.length > 0);

                for (const statement of statements) {
                    await this.db.runAsync(statement);
                }
            }

            console.log('✅ All migrations completed successfully');

        } catch (error) {
            console.error('❌ Migration error:', error);
            throw error;
        }
    }

    // Seed database with initial data
    async seedDatabase() {
        try {
            const seedsDir = path.join(__dirname, '../seeds');
            
            if (!fs.existsSync(seedsDir)) {
                console.warn('⚠️  Seeds directory not found:', seedsDir);
                return;
            }

            const seedFiles = fs.readdirSync(seedsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();

            console.log('🌱 Seeding database with initial data...');

            for (const file of seedFiles) {
                console.log(`📄 Running seed: ${file}`);
                const seedPath = path.join(seedsDir, file);
                const seedSQL = fs.readFileSync(seedPath, 'utf8');
                
                // Split SQL into individual statements
                const statements = seedSQL
                    .split(';')
                    .map(stmt => stmt.trim())
                    .filter(stmt => stmt.length > 0);

                for (const statement of statements) {
                    await this.db.runAsync(statement);
                }
            }

            console.log('✅ Database seeding completed successfully');

        } catch (error) {
            console.error('❌ Seeding error:', error);
            throw error;
        }
    }

    // Initialize database with migrations and seeds
    async initialize() {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            await this.runMigrations();
            await this.seedDatabase();

            console.log('🎉 Database initialization completed successfully');

        } catch (error) {
            console.error('❌ Database initialization error:', error);
            throw error;
        }
    }

    // Close database connection
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Database close error:', err.message);
                        reject(err);
                    } else {
                        console.log('📴 Database connection closed');
                        this.isConnected = false;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // Get database instance
    getDatabase() {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not connected');
        }
        return this.db;
    }

    // Check database health
    async healthCheck() {
        try {
            const result = await this.db.getAsync('SELECT 1 as health');
            return { healthy: result.health === 1 };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }

    // Get database statistics
    async getStats() {
        try {
            const tables = await this.db.allAsync(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `);

            const stats = {};
            for (const table of tables) {
                const count = await this.db.getAsync(`SELECT COUNT(*) as count FROM ${table.name}`);
                stats[table.name] = count.count;
            }

            return stats;
        } catch (error) {
            console.error('Get database stats error:', error);
            return {};
        }
    }

    // Backup database
    async backup(backupPath) {
        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(this.dbPath);
            const writeStream = fs.createWriteStream(backupPath);

            readStream.on('error', reject);
            writeStream.on('error', reject);
            writeStream.on('finish', resolve);

            readStream.pipe(writeStream);
        });
    }
}

// Export singleton instance
module.exports = new DatabaseConnection();
