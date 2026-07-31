import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard/Dashboard'; 

export const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

    return (
        <div>
            {isAuthenticated ? (
                <Dashboard onLogout={() => setIsAuthenticated(false)} />
            ) : (
                <Login onLoginSuccess={() => setIsAuthenticated(true)} />
            )}
        </div>
    );
};

export default App;