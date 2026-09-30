import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard/Dashboard'; 

export const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    const [token, setToken] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
    
        if (tokenFromUrl || localStorage.getItem('auth_token')){
            const activeToken = tokenFromUrl || localStorage.getItem('auth_token');
            if (tokenFromUrl) {
                localStorage.setItem('auth_token', tokenFromUrl);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            setIsAuthenticated(true);
            return activeToken;
        }
        return localStorage.getItem('auth_token');
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