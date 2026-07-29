import React, { useState } from 'react';
import styles from './Login.module.css';

// Rutas de imágenes
import SSPCLogo from '../images/SSPC.png';
import TexturaRoja from '../images/textura-roja.png';
import TexturaClara from '../images/textura-roja2.png';

interface LoginProps {
    onLoginSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onLoginSuccess) {
            onLoginSuccess();
        }
    };

    return (
        <div
            className={styles.loginPageBackground}
            style={{
                backgroundImage: `linear-gradient(rgba(240, 240, 240, 0.85), rgba(240, 240, 240, 0.85)), url(${TexturaClara})`
            }}
        >
            <div
                className={styles.mainBannerCard}
                style={{ backgroundImage: `url(${TexturaRoja})` }}
            >
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <img src={SSPCLogo} alt="SSPC Logo" className={styles.sspcLogo} />
                    </div>

                    <h2 className={styles.title}>Iniciar Sesión</h2>
                    <p className={styles.subtitle}>Sistema de Vales de Despensa</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="usuario">Usuario o correo</label>
                        <div className={styles.inputWrapper}>
                            <span className={styles.inputIcon}>👤</span>
                            <input
                                id="usuario"
                                type="text"
                                value={usuario}
                                onChange={(e) => setUsuario(e.target.value)}
                                placeholder="ejemplo@sspc.gob.mx"
                                className={styles.input}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="contrasena">Contraseña</label>
                        <div className={styles.inputWrapper}>
                            <span className={styles.inputIcon}>🔒</span>
                            <input
                                id="contrasena"
                                type="password"
                                value={contrasena}
                                onChange={(e) => setContrasena(e.target.value)}
                                placeholder="••••••••"
                                className={styles.input}
                                required
                            />
                        </div>
                    </div>

                    <a href="#recuperar" className={styles.forgotPassword}>
                        ¿Olvidaste tu contraseña?
                    </a>

                    <button type="submit" className={styles.submitButton}>
                        Ingresar
                    </button>
                </form>
            </div>
        </div>
    );
};