import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
};

let pool = mysql.createPool(dbConfig);

const tryConnection = async (connectionPool, retries = 15, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const connection = await connectionPool.getConnection();
            connection.release();
            return;
        } catch (error) {
            if (i < retries - 1) {
                console.log(`[DB] Connection attempt ${i + 1}/${retries} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
};

try {
    await tryConnection(pool);
    console.log(`✅ Connected to MySQL at ${dbConfig.host}:${dbConfig.port}`);
} catch (error) {
    console.warn(`⚠️  Unable to connect to MySQL at ${dbConfig.host}:${dbConfig.port}:`, error.message);

    // Fallback for local development
    if (!process.env.DB_USE_CONTAINER) {
        console.log('[DB] Attempting fallback connection to 127.0.0.1:3307...');
        const fallbackConfig = {
            ...dbConfig,
            host: "127.0.0.1",
            port: 3307,
        };

        const fallbackPool = mysql.createPool(fallbackConfig);
        try {
            await tryConnection(fallbackPool);
            console.log(`✅ Connected to MySQL fallback at ${fallbackConfig.host}:${fallbackConfig.port}`);
            pool = fallbackPool;
        } catch (fallbackError) {
            console.error(`❌ Fallback MySQL connection failed at ${fallbackConfig.host}:${fallbackConfig.port}:`, fallbackError.message);
            throw fallbackError;
        }
    } else {
        throw error;
    }
}

export default pool;
