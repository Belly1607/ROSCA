import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';


export default function Sidebar() {
    const location = useLocation();
    
    const navItems = [
        { path: '/home', label: 'Home', icon: '🏠' },
        { path: '/member', label: 'Members', icon: '👥' },
        { path: '/balance', label: 'Balance', icon: '💰' },
        { path: '/report', label: 'Reports', icon: '📊' },
        { path: '/loan', label: 'Loans', icon: '🔑' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <aside className="sidebar">
            {/* Sidebar Header */}
            <div className="sidebar-header">
                <h3>Menu</h3>
                <div className="sidebar-divider"></div>
            </div>

            {/* Navigation Links */}
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                        {isActive(item.path) && <span className="nav-indicator"></span>}
                    </Link>
                ))}
            </nav>

            {/* Sidebar Footer */}
            <div className="sidebar-footer">
                <div className="footer-card">
                    <p className="footer-title">Fund Health</p>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '75%' }}></div>
                    </div>
                    <span className="progress-text">75%</span>
                </div>
            </div>
        </aside>
    );
}
