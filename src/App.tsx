import { useState } from 'react';
import { Login } from './components/Login';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  return (
    <main>
      {isAuthenticated ? (
        <Dashboard />
      ) : (
        <Login onLoginSuccess={() => setIsAuthenticated(true)} />
      )}
    </main>
  );
}

export default App;