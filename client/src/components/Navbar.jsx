import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/dashboard') return 'Dashboard';
        if (path === '/repositories') return 'Repositories';
        if (path.startsWith('/repositories/')) return 'Repository Analytics';
        return 'Dashboard';
    };

    return (
        <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800/60 px-8 py-4 flex justify-between items-center sticky top-0 z-30">
            <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold text-white tracking-tight">{getPageTitle()}</h2>
            </div>
            <div className="flex items-center space-x-4">
                {user && (
                    <div className="flex items-center space-x-3 bg-gray-850/40 border border-gray-800/50 rounded-full pl-3 pr-2 py-1">
                        <span className="text-gray-200 text-sm font-medium">{user.username}</span>
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt="Avatar"
                                className="w-7 h-7 rounded-full border border-gray-750"
                            />
                        ) : (
                            <div className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">
                                {user.username?.slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        <span className="h-4 w-px bg-gray-700/50 mx-1" />
                        <button
                            onClick={logout}
                            className="text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Navbar;