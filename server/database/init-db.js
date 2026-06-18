import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
    console.log('🔄 Initializing database schema...');

    let connection;
    try {
        const dbConfig = {
            host: process.env.DB_HOST || "localhost",
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASSWORD || "root",
            database: process.env.DB_NAME || "devpulse",
            ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
            multipleStatements: true,
        };

        console.log(`📡 Connecting to MySQL at ${dbConfig.host}:${dbConfig.port}...`);
        connection = await mysql.createConnection(dbConfig);

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('📝 Executing schema.sql...');
        await connection.query(schema);

        console.log('✅ Database schema initialized successfully!');
        console.log('📋 All tables created/updated with proper columns');

    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        console.error('   Host:', process.env.DB_HOST || 'not set');
        console.error('   Port:', process.env.DB_PORT || 'not set');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initializeDatabase();
