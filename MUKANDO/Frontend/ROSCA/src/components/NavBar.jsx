import React, { useState } from "react";


function NavBar({ user, onLogout }) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <nav className="navbar">
            {/* Logo */}
            <div className="navbar-logo">
                <div className="logo-text">ROSCA</div>
            </div>

            {/* User Section */}
            <div className="navbar-user">
                <button 
                    className="user-trigger"
                    onClick={() => setShowMenu(!showMenu)}
                >
                    <span className="avatar">👤</span>
                    <span className="name">{user?.username || "Guest"}</span>
                </button>

                {showMenu && (
                    <div className="user-menu">
                        <a href="#profile" className="menu-link">Profile</a>
                        <a href="#settings" className="menu-link">Settings</a>
                        <button className="menu-link logout" onClick={onLogout}>
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default NavBar;
