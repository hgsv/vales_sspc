import React, { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import { API_ENDPOINTS } from '../../config/api';
import { GestorView } from '../gestor/gestorView';
import { EstatusValesView } from '../admin/EstatusValesView';
import { CardsView } from '../tarjetas/CardsView';
import { UsersView } from '../admin/UsersView';
import { ReportsView } from '../admin/ReportsView';

import TexturaRoja from '../../images/textura-roja.png';
import TexturaClara from '../../images/textura-roja2.png';

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [user, setUser] = useState({
    firstName: 'Usuario',
    lastName: '',
    middleName: '',
    email: '',
    nivel: '',
    unidad: '',
    origen: '',
    idType: null as number | null,
  });

  const [roleName, setRoleName] = useState('Usuario');
  const [activeTab, setActiveTab] = useState('vales');

  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setLoadingUser(false);
        return;
      }

      try {
        const response = await fetch(`${API_ENDPOINTS.MAIN}/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          onLogout();
          return;
        }

        if (!response.ok) {
          throw new Error('No se pudo obtener la información del perfil');
        }

        const data = await response.json();
        const u = data.user ? data.user : data;

        const firstName = u.firstname || 'Usuario';
        const lastName = u.lastname || '';
        const middleName = u.middlename || '';
        const email = u.email || '';
        const nivel = u.nivel || '';
        const unidad = u.unidad || '';
        const origen = u.origen || '';

        const numericIdType =
          u.idtype !== null && u.idtype !== undefined
            ? Number(u.idtype)
            : null;

        setUser({
          firstName,
          lastName,
          middleName,
          email,
          nivel,
          unidad,
          origen,
          idType: numericIdType,
        });

        setActiveTab(numericIdType === 1 ? 'control-vales' : 'vales');

        switch (numericIdType) {
          case 1:
            setRoleName('Administrador');
            break;
          case 2:
            setRoleName('Gestor de Prestaciones');
            break;
          case 3:
            setRoleName('Enlace');
            break;
          default:
            setRoleName('Enlace');
            break;
        }
      } catch (error) {
        console.error('Error al consultar el perfil en el backend:', error);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserData();
  }, [onLogout]);

  const fullName =
    `${user.firstName} ${user.lastName} ${user.middleName}`.trim();

  return (
    <div
      className={styles.dashboardContainer}
      style={{ '--bg-claro': `url(${TexturaClara})` } as React.CSSProperties}
    >
      <aside
        className={styles.sidebar}
        style={{ '--bg-rojo': `url(${TexturaRoja})` } as React.CSSProperties}
      >
        <div>
          <div className={styles.sidebarHeader}>
            <h2>Panel {roleName}</h2>
            <p className={styles.systemName}>
              Medida de fin de año {new Date().getFullYear()}
            </p>
          </div>

          <div className={styles.userInfoCard}>
            <div className={styles.userDetails}>
              <span className={styles.userName} title={fullName}>
                {loadingUser ? 'Cargando...' : fullName}
              </span>
              <span className={styles.userRole}>{roleName}</span>
            </div>
          </div>

          <nav className={styles.navMenu}>
            {user.idType !== 1 && (
              <button
                className={`${styles.navItem} ${activeTab === 'vales' ? styles.active : ''
                  }`}
                onClick={() => setActiveTab('vales')}
              >
                Selección de personal autorizado
              </button>
            )}

            {user.idType === 1 && (
              <button
                className={`${styles.navItem} ${activeTab === 'control-vales' ? styles.active : ''
                  }`}
                onClick={() => setActiveTab('control-vales')}
              >
                Control y Estatus
              </button>
            )}

            {user.idType === 1 && (
              <button
                className={`${styles.navItem} ${activeTab === 'gestion-tarjetas' ? styles.active : ''
                  }`}
                onClick={() => setActiveTab('gestion-tarjetas')}
              >
                Gestión de tarjetas
              </button>
            )}

            <button
              className={`${styles.navItem} ${activeTab === 'reportes' ? styles.active : ''
                }`}
              onClick={() => setActiveTab('reportes')}
            >
              Reportes
            </button>

            {user.idType === 1 && (
              <button
                className={`${styles.navItem} ${activeTab === 'usuarios' ? styles.active : ''
                  }`}
                onClick={() => setActiveTab('usuarios')}
              >
                Usuarios
              </button>
            )}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <button onClick={onLogout} className={styles.logoutButton}>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topHeader}>
          <h1>Hola, {loadingUser ? '...' : user.firstName}</h1>

          <div className={styles.headerBadges}>
            {user.unidad && (
              <span className={styles.unitBadge}>Unidad: {user.unidad}</span>
            )}
            {user.nivel && (
              <span className={styles.levelBadge}>Nivel: {user.nivel}</span>
            )}
          </div>
        </header>

        <section className={styles.contentBody}>
          {activeTab === 'vales' && user.idType !== 1 && (
            <GestorView origenUsuario={user.origen} />
          )}

          {activeTab === 'control-vales' && user.idType === 1 && (
            <EstatusValesView />
          )}

          {activeTab === 'gestion-tarjetas' && user.idType === 1 && (
            <div className={styles.card}>
              <h2>Gestión de tarjetas</h2>
              <p className={styles.secondaryText}>
                Apartado exclusivo para la administración de tarjetas.
              </p>
              <CardsView />
            </div>
          )}

          {activeTab === 'reportes' && (
            <ReportsView />
          )}

          {activeTab === 'usuarios' && user.idType === 1 && <UsersView />}
        </section>
      </main>
    </div>
  );
}
