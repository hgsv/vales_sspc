import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard/Dashboard'; 

export const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    /*
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);/*/
    const[token,setToken] = useState(()=>{ // Se agrego para poder tener acceso desde Mi portal RH
            const urlParams = new URLSearchParams(window.location.search);
            const tokenFromUrl = urlParams.get('token');
    
            if (tokenFromUrl || localStorage.getItem('auth_token')){
                localStorage.setItem('auth_token', tokenFromUrl);
                window.history.replaceState({},document.title,window.location.pathname);
                setIsAuthenticated(true);
                return tokenFromUrl;
            }
            return localStorage.getItem('auth_token');
        });
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
