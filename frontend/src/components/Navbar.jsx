import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold">
              SafeZone
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/"
                  className="hover:text-purple-200 transition-colors duration-200"
                >
                  Home
                </Link>
                <Link
                  to="/safety-map"
                  className="hover:text-purple-200 transition-colors duration-200"
                >
                  Safety Map
                </Link>
                <Link
                  to="/trip-monitor"
                  className="hover:text-purple-200 transition-colors duration-200"
                >
                  Trip Monitor
                </Link>
                <Link
                  to="/profile"
                  className="hover:text-purple-200 transition-colors duration-200"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hover:text-purple-200 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 