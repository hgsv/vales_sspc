import React, { useEffect, useState, ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import styles from './Dashboard.module.css';

interface TypeUser {
    idType: number;
    name?: string;
    description?: string;
}

interface UserData {
    id_user: number;
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    nivel?: string;
    unidad?: string;
    type_user?: TypeUser;
}

interface DashboardProps {
    onLogout?: () => void;
}

type ExcelRow = Record<string, any>;

const mockValesData: ExcelRow[] = [
    {
        "ID Empleado": "EMP-1001",
        "Nombre Completo": "Carlos Mendoza Ruiz",
        "Departamento": "Recursos Humanos",
        "Monto ($)": 2500.00,
        "No. Tarjeta / Folio": "4532-XXXX-8901",
        "Estatus": "Asignado",
        "Fecha Emisión": "2026-07-01"
    },
    {
        "ID Empleado": "EMP-1002",
        "Nombre Completo": "Ana Sofía Guerrero",
        "Departamento": "Contabilidad",
        "Monto ($)": 3200.00,
        "No. Tarjeta / Folio": "4532-XXXX-1122",
        "Estatus": "Entregado",
        "Fecha Emisión": "2026-07-01"
    },
    {
        "ID Empleado": "EMP-1003",
        "Nombre Completo": "Roberto Gómez Bolaños",
        "Departamento": "Sistemas",
        "Monto ($)": 2800.00,
        "No. Tarjeta / Folio": "4532-XXXX-4455",
        "Estatus": "Pendiente",
        "Fecha Emisión": "2026-07-02"
    },
    {
        "ID Empleado": "EMP-1004",
        "Nombre Completo": "María Elena Torrealba",
        "Departamento": "Operaciones",
        "Monto ($)": 2500.00,
        "No. Tarjeta / Folio": "4532-XXXX-9988",
        "Estatus": "Entregado",
        "Fecha Emisión": "2026-07-02"
    },
    {
        "ID Empleado": "EMP-1005",
        "Nombre Completo": "Javier Hernández Balcázar",
        "Departamento": "Logística",
        "Monto ($)": 3000.00,
        "No. Tarjeta / Folio": "4532-XXXX-3344",
        "Estatus": "Cancelado",
        "Fecha Emisión": "2026-07-03"
    }
];

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [activeSection, setActiveSection] = useState('inicio');
    
    // Estados para gestión de drag & drop y lectura de Excel
    const [isDragging, setIsDragging] = useState(false);
    const [excelData, setExcelData] = useState<ExcelRow[]>(mockValesData);
    const [columns, setColumns] = useState<string[]>(Object.keys(mockValesData[0]));
    const [fileName, setFileName] = useState<string>('Datos_Ejemplo_Vales.xlsx');

    useEffect(() => {
        const storedUser = localStorage.getItem('user_info');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Error al obtener información de sesión", e);
            }
        }
    }, []);

    const handleLogout = async () => {
        const token = localStorage.getItem('auth_token');

        try {
            if (token) {
                await fetch('http://localhost:9000/api/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (e) {
            console.error("Error al cerrar sesión en el servidor", e);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
            if (onLogout) onLogout();
        }
    };

    const processExcelFile = (file: File) => {
        setFileName(file.name);
        const reader = new FileReader();

        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

            const data = XLSX.utils.sheet_to_json<ExcelRow>(ws);

            if (data.length > 0) {
                const headers = Object.keys(data[0]);
                setColumns(headers);
                setExcelData(data);
            } else {
                setColumns([]);
                setExcelData([]);
            }
        };

        reader.readAsBinaryString(file);
    };

    const handleResetToMockData = () => {
        setExcelData(mockValesData);
        setColumns(Object.keys(mockValesData[0]));
        setFileName('Datos_Ejemplo_Vales.xlsx');
    };

    const fullName = user
        ? `${user.firstName} ${user.lastName} ${user.middleName || ''}`.trim()
        : 'Usuario';

    const userRole = user?.type_user?.name
        || user?.type_user?.description
        || 'Administrador';

    return (
        <div className={styles.dashboardContainer}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h2>Panel Administrador</h2>
                    <p className={styles.systemName}>Vales de Despensa</p>
                </div>

                <div className={styles.userInfoCard}>
                    <div className={styles.avatar}>👤</div>
                    <div className={styles.userDetails}>
                        <span className={styles.userName}>{fullName}</span>
                        <span className={styles.userRole}>{userRole}</span>
                    </div>
                </div>

                <nav className={styles.navMenu}>
                    <button
                        className={`${styles.navItem} ${activeSection === 'inicio' ? styles.active : ''}`}
                        onClick={() => setActiveSection('inicio')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-house" viewBox="0 0 16 16">
                            <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5z" />
                        </svg>Inicio
                    </button>

                    <button
                        className={`${styles.navItem} ${activeSection === 'vales' ? styles.active : ''}`}
                        onClick={() => setActiveSection('vales')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-journal-check" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M10.854 6.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 8.793l2.646-2.647a.5.5 0 0 1 .708 0" />
                            <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2" />
                            <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z" />
                        </svg> Gestión de Vales
                    </button>

                    <button
                        className={`${styles.navItem} ${activeSection === 'reportes' ? styles.active : ''}`}
                        onClick={() => setActiveSection('reportes')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pencil-square" viewBox="0 0 16 16">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" />
                            <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z" />
                        </svg> Reportes
                    </button>

                    <button
                        className={`${styles.navItem} ${activeSection === 'usuarios' ? styles.active : ''}`}
                        onClick={() => setActiveSection('usuarios')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-people" viewBox="0 0 16 16">
                            <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4" />
                        </svg> Usuarios
                    </button>
                </nav>

                <div className={styles.sidebarFooter}>
                    <button onClick={handleLogout} className={styles.logoutButton}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-bar-left" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M12.5 15a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5M10 8a.5.5 0 0 1-.5.5H3.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L3.707 7.5H9.5a.5.5 0 0 1 .5.5" />
                        </svg>Cerrar Sesión
                    </button>
                </div>
            </aside>

            <main className={styles.mainContent}>
                <header className={styles.topHeader}>
                    <div>
                        <h1>Hola, {user?.firstName || 'Usuario'}</h1>
                        <small style={{ color: '#666' }}>{user?.email}</small>
                    </div>
                    <div className={styles.headerBadges}>
                        <span className={styles.unitBadge}>
                            Unidad: {user?.unidad || 'N/A'}
                        </span>
                        <span className={styles.levelBadge}>
                            Nivel: {user?.nivel || 'N/A'}
                        </span>
                    </div>
                </header>

                <section className={styles.contentBody}>
                    {activeSection === 'inicio' && (
                        <div className={styles.card}>
                            <h3>Resumen General</h3>
                            <p>Bienvenido al Sistema de Vales de Despensa.</p>
                        </div>
                    )}

                    {activeSection === 'vales' && (
                        <div className={styles.card}>
                            <div className={styles.cardHeaderFlex}>
                                <div>
                                    <h3>Control y Asignación de Vales</h3>
                                    <p>Cargue un archivo Excel (.xlsx / .xls) o consulte los datos del registro actual.</p>
                                </div>
                                <button 
                                    className={styles.resetButton} 
                                    onClick={handleResetToMockData}
                                    title="Restaurar vista previa con datos ficticios"
                                >
                                    🔄 Restablecer Ejemplo
                                </button>
                            </div>

                            <div 
                                className={`${styles.dropZone} ${isDragging ? styles.dragOver : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) processExcelFile(file);
                                }}
                            >
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) processExcelFile(file);
                                    }}
                                    id="excel-input"
                                    className={styles.fileInputHidden}
                                />
                                
                                <label htmlFor="excel-input" className={styles.dropZoneContent}>
                                    <div className={styles.uploadIconContainer}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                            <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                                        </svg>
                                    </div>
                                    <div className={styles.uploadTextGroup}>
                                        <span className={styles.primaryText}>
                                            {fileName ? `Archivo cargado: ${fileName}` : 'Arrastra y suelta tu archivo Excel aquí'}
                                        </span>
                                        <span className={styles.secondaryText}>
                                            o <strong className={styles.browseLink}>haz clic para seleccionar en tu equipo</strong> (.xlsx, .xls)
                                        </span>
                                    </div>
                                </label>
                            </div>

                            {excelData.length > 0 ? (
                                <div className={styles.tableContainer}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                {columns.map((col, index) => (
                                                    <th key={index}>{col}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {excelData.map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {columns.map((col, colIndex) => {
                                                        const cellValue = row[col];
                                                        
                                                        if (col.toLowerCase() === 'estatus') {
                                                            return (
                                                                <td key={colIndex}>
                                                                    <span className={`${styles.statusBadge} ${styles[cellValue?.toString().toLowerCase()]}`}>
                                                                        {cellValue}
                                                                    </span>
                                                                </td>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <td key={colIndex}>
                                                                {cellValue !== undefined ? String(cellValue) : ''}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <p>No se encontraron registros en el archivo cargado.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === 'reportes' && (
                        <div className={styles.card}>
                            <h3>Reportes y Estadísticas</h3>
                            <p>Módulo para la generación de reportes del sistema.</p>
                        </div>
                    )}

                    {activeSection === 'usuarios' && (
                        <div className={styles.card}>
                            <h3>Gestión de Usuarios</h3>
                            <p>Módulo para listar y administrar cuentas asociadas a Oracle.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};