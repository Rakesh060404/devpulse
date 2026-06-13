import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        console.log('[AUTH MIDDLEWARE] Checking authentication...');
        console.log('[AUTH MIDDLEWARE] Auth header exists:', !!authHeader);

        // check if token exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log('[AUTH MIDDLEWARE] No token provided or invalid format');
            return res.status(401).json({
                error: "No token provided",
            });
        }

        // extract token
        const token = authHeader.split(" ")[1];
        console.log('[AUTH MIDDLEWARE] Token extracted, length:', token.length);

        // verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('[AUTH MIDDLEWARE] Token verified successfully');
        console.log('[AUTH MIDDLEWARE] User ID:', decoded.id);

        // attach user data to request
        req.user = decoded;

        next();
    } catch (error) {
        console.error('[AUTH MIDDLEWARE] Authentication failed:', error.message);
        return res.status(401).json({
            error: "Invalid or expired token",
        });
    }
};

export default authMiddleware;