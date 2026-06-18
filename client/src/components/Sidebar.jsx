import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/repositories', label: 'Repositories', icon: '📁' },
    ];

    return (
        <div className="w-64 bg-gray-950 border-r border-gray-800/60 h-full flex flex-col">
            <div className="p-6 border-b border-gray-900/50">
                <h1 className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-primary-400 to-blue-500 bg-clip-text text-transparent">
                    DevPulse
                </h1>
            </div>
            <nav className="flex-1 px-4 py-6">
                <ul className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                                        isActive
                                            ? 'bg-gradient-to-r from-primary-600/20 to-blue-600/10 border border-primary-500/20 text-primary-400 shadow-md shadow-primary-950/20'
                                            : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200 border border-transparent'
                                    }`}
                                >
                                    <span className={`mr-3 text-lg transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                                        {item.icon}
                                    </span>
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;