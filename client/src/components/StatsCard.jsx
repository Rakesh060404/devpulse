import React from 'react';

const StatsCard = ({ title, value, change, icon }) => {
    return (
        <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-sm">{title}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    {!!change && (
                        <p className={`text-sm ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {change > 0 ? '+' : ''}{change}% from last week
                        </p>
                    )}
                </div>
                <div className="text-3xl">{icon}</div>
            </div>
        </div>
    );
};

export default StatsCard;