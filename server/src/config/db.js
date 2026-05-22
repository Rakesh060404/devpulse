import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

let pool = mysql.createPool(dbConfig);

const tryConnection = async (connectionPool) => {
    const connection = await connectionPool.getConnection();
    connection.release();
};

try {
    await tryConnection(pool);
    console.log(`Connected to MySQL at ${dbConfig.host}:${dbConfig.port}`);
} catch (error) {
    console.warn(`Unable to connect to MySQL at ${dbConfig.host}:${dbConfig.port}:`, error.message);

    // Local development support for Docker-published MySQL on port 3307
    if ((dbConfig.host === "mysql" || dbConfig.host === "localhost") && !process.env.DB_USE_CONTAINER) {
        const fallbackConfig = {
            ...dbConfig,
            host: "127.0.0.1",
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3307,
        };

        const fallbackPool = mysql.createPool(fallbackConfig);
        try {
            await tryConnection(fallbackPool);
            console.log(`Connected to MySQL fallback at ${fallbackConfig.host}:${fallbackConfig.port}`);
            pool = fallbackPool;
        } catch (fallbackError) {
            console.error(`Fallback MySQL connection failed at ${fallbackConfig.host}:${fallbackConfig.port}:`, fallbackError.message);
            throw fallbackError;
        }
    } else {
        throw error;
    }
}

export default pool;
