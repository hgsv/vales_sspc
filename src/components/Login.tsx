import React, { useState } from 'react';
import styles from './Login.module.css';
import { apiUrl } from '../config/api';

import SSPCLogo from '../images/SSPC.png';
import TexturaRoja from '../images/textura-roja.png';
import TexturaClara from '../images/textura-roja2.png';

interface LoginProps {
    onLoginSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mustChangePasswordView, setMustChangePasswordView] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [tempToken, setTempToken] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(apiUrl('login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: usuario,
                    password: contrasena
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Credenciales incorrectas o error en el servidor');
            }

            if (data.require_password_change) {
                setTempToken(data.access_token);
                setMustChangePasswordView(true);
                return;
            }

            if (data.access_token) {
                localStorage.setItem('auth_token', data.access_token);
            }

            const userData = data.data?.user || data.user;
            if (userData) {
                localStorage.setItem('user_info', JSON.stringify(userData));
            }

            if (onLoginSuccess) {
                onLoginSuccess();
            }

        } catch (err: any) {
            setError(err.message || 'Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(apiUrl('change-password'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${tempToken}`
                },
                body: JSON.stringify({
                    password: newPassword,
                    password_confirmation: confirmPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al actualizar la contraseña');
            }

            const authToken = data.access_token || tempToken;
            if (authToken) {
                localStorage.setItem('auth_token', authToken);
            }

            const userData = data.data?.user || data.user;
            if (userData) {
                localStorage.setItem('user_info', JSON.stringify(userData));
            }

            if (onLoginSuccess) {
                onLoginSuccess();
            }

        } catch (err: any) {
            setError(err.message || 'No se pudo actualizar la contraseña.');
        } finally {
            setLoading(false);
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

                    <h2 className={styles.title}>
                        {mustChangePasswordView ? 'Actualizar Contraseña' : 'Iniciar Sesión'}
                    </h2>
                    <p className={styles.subtitle}>
                        {mustChangePasswordView
                            ? 'Por seguridad debes cambiar tu contraseña inicial'
                            : 'Sistema de Medida de fin de año'}
                    </p>
                </div>

                {error && (
                    <div className={styles.errorMessage} style={{ color: '#ffb3b3', textAlign: 'center', marginBottom: '1rem', fontSize: '0.85rem' }}>
                        ⚠️ {error}
                    </div>
                )}

                {!mustChangePasswordView ? (
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="usuario">Usuario o correo</label>
                            <div className={styles.inputWrapper}>
                                <span className={styles.inputIcon}>👤</span>
                                <input
                                    id="usuario"
                                    type="email"
                                    value={usuario}
                                    onChange={(e) => setUsuario(e.target.value)}
                                    placeholder="ejemplo@sspc.gob.mx"
                                    className={styles.input}
                                    required
                                    disabled={loading}
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
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <a href="#recuperar" className={styles.forgotPassword}>
                            ¿Olvidaste tu contraseña?
                        </a>

                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleChangePasswordSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="newPassword">Nueva Contraseña</label>
                            <div className={styles.inputWrapper}>
                                <span className={styles.inputIcon}>🔑</span>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={styles.input}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="confirmPassword">Confirmar Contraseña</label>
                            <div className={styles.inputWrapper}>
                                <span className={styles.inputIcon}>🔒</span>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={styles.input}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar y Continuar'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};