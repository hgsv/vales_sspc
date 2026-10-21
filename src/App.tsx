import React, { useState } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard/Dashboard';

export const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        const storedToken = localStorage.getItem('auth_token');

        if (tokenFromUrl) {
            localStorage.setItem('auth_token', tokenFromUrl);
        }

        if (tokenFromUrl || storedToken) {
            window.history.replaceState({}, document.title, window.location.pathname);
            return true;
        }

        return false;
    });

    return (
        <div>
            {isAuthenticated ? (
                <Dashboard onLogout={() => {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('usuario');
                    setIsAuthenticated(false);
                }} />
            ) : (
                <Login onLoginSuccess={() => setIsAuthenticated(true)} />
            )}
        </div>
    );
};

export default App;