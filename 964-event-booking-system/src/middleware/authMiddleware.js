// middleware/authMiddleware.js
const Role = (allowedRoles) => (req, res, next) => {
    const { user } = req; // Assume user object is attached by a prior auth middleware
    
    if (!user) {
        return res.status(401).json({ message: "Authentication required." });
    }

    if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: `Forbidden: Requires ${allowedRoles.join(', ')} role.` });
    }

    next();
};

// Export specialized checkers
exports.isOrganizer = Role(['Organizer']);
exports.isCustomer = Role(['Customer']);
