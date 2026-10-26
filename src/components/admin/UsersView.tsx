import React, { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../../config/api';
import '../gestor/GestorView.css';

type Origen = 'secretaría' | 'guardia';

interface Usuario {
    id_user: number | string;
    numEmpleado?: string;
    numempleado?: string;
    NUMEMPLEADO?: string;
    firstName?: string;
    firstname?: string;
    FIRSTNAME?: string;
    lastName?: string;
    lastname?: string;
    LASTNAME?: string;
    middleName?: string;
    middlename?: string;
    MIDDLENAME?: string;
    nivel?: string;
    unidad?: string;
    email?: string;
    origen?: string;
    idType?: number | string;
    idtype?: number | string;
    active?: number | string | boolean;
    typeuser?: string;
}

interface FormularioUsuario {
    numEmpleado: string;
    origen: Origen;
    firstName: string;
    lastName: string;
    middleName: string;
    nivel: string;
    unidad: string;
    email: string;
    password: string;
    idType: string;
    active: boolean;
}

const formularioInicial: FormularioUsuario = {
    numEmpleado: '',
    origen: 'secretaría',
    firstName: '',
    lastName: '',
    middleName: '',
    nivel: '',
    unidad: '',
    email: '',
    password: '',
    idType: '3',
    active: false,
};

const obtenerId = (usuario: Usuario) =>
    usuario.id_user ?? (usuario as any).ID_USER;

const obtenerNumero = (usuario: Usuario) =>
    usuario.numEmpleado ?? usuario.numempleado ?? usuario.NUMEMPLEADO ?? '';

const obtenerNombre = (usuario: Usuario) => {
    const nombre =
        usuario.firstName ?? usuario.firstname ?? usuario.FIRSTNAME ?? '';
    const apellido =
        usuario.lastName ?? usuario.lastname ?? usuario.LASTNAME ?? '';
    const materno =
        usuario.middleName ?? usuario.middlename ?? usuario.MIDDLENAME ?? '';

    return `${nombre} ${apellido} ${materno}`.trim();
};

const normalizarUsuario = (usuario: Usuario): FormularioUsuario => ({
    numEmpleado: String(obtenerNumero(usuario)),
    origen: usuario.origen === 'guardia' ? 'guardia' : 'secretaría',
    firstName:
        usuario.firstName ?? usuario.firstname ?? usuario.FIRSTNAME ?? '',
    lastName: usuario.lastName ?? usuario.lastname ?? usuario.LASTNAME ?? '',
    middleName:
        usuario.middleName ?? usuario.middlename ?? usuario.MIDDLENAME ?? '',
    nivel: usuario.nivel ?? '',
    unidad: usuario.unidad ?? '',
    email: usuario.email ?? '',
    password: '',
    idType: String(usuario.idType ?? usuario.idtype ?? '3'),
    active: Number(usuario.active) === 1 || usuario.active === true,
});

export function UsersView() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [formulario, setFormulario] =
        useState<FormularioUsuario>(formularioInicial);
    const [usuarioEditando, setUsuarioEditando] = useState<string | null>(null);

    const [busqueda, setBusqueda] = useState('');
    const [filtroOrigen, setFiltroOrigen] = useState('');
    const [pagina, setPagina] = useState(1);
    const [porPagina, setPorPagina] = useState(10);

    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [consultandoEmpleado, setConsultandoEmpleado] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const token = () => localStorage.getItem('auth_token');

    const cargarUsuarios = async () => {
        setCargando(true);
        setError('');

        try {
            const response = await fetch(apiUrl('admin/users'), {
                headers: {
                    Authorization: `Bearer ${token()}`,
                    Accept: 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'No se pudieron cargar los usuarios.');
            }

            const lista = data.data ?? data.users ?? data;
            setUsuarios(Array.isArray(lista) ? lista : []);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Error al cargar los usuarios.'
            );
            setUsuarios([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const usuariosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return usuarios.filter((usuario) => {
            const origen = String(usuario.origen ?? '').toLowerCase();
            const coincideOrigen = !filtroOrigen || origen === filtroOrigen;

            const contenido = [
                obtenerNumero(usuario),
                obtenerNombre(usuario),
                usuario.email ?? '',
                usuario.unidad ?? '',
                usuario.nivel ?? '',
                origen,
                usuario.typeuser ?? '',
            ]
                .join(' ')
                .toLowerCase();

            return coincideOrigen && contenido.includes(texto);
        });
    }, [usuarios, busqueda, filtroOrigen]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(usuariosFiltrados.length / porPagina)
    );

    const usuariosPagina = usuariosFiltrados.slice(
        (pagina - 1) * porPagina,
        pagina * porPagina
    );

    const actualizarCampo = (
        campo: keyof FormularioUsuario,
        valor: string | boolean
    ) => {
        setFormulario((actual) => ({ ...actual, [campo]: valor }));
    };

    const validarEmpleado = async () => {
        if (!formulario.numEmpleado.trim()) {
            setError('Escribe el número de empleado para validarlo.');
            return;
        }

        setConsultandoEmpleado(true);
        setError('');
        setMensaje('');

        try {
            const params = new URLSearchParams({
                numEmpleado: formulario.numEmpleado.trim(),
                origen: formulario.origen,
            });

            const response = await fetch(
                `${apiUrl('admin/users/empleado')}?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token()}`,
                        Accept: 'application/json',
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'No se encontró al empleado.');
            }

            const empleado = data.data ?? data;

            setFormulario((actual) => ({
                ...actual,
                numEmpleado: String(
                    empleado.numEmpleado ??
                    empleado.num_empleado ??
                    actual.numEmpleado
                ),
                firstName:
                    empleado.firstName ?? empleado.nombre ?? actual.firstName,
                lastName:
                    empleado.lastName ??
                    empleado.apellido_paterno ??
                    actual.lastName,
                middleName:
                    empleado.middleName ??
                    empleado.apellido_materno ??
                    actual.middleName,
                nivel: empleado.nivel ?? actual.nivel,
                unidad: empleado.unidad ?? actual.unidad,
            }));

            setMensaje('Empleado encontrado. Revisa los datos y completa el formulario.');
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Error al validar al empleado.'
            );
        } finally {
            setConsultandoEmpleado(false);
        }
    };

    const limpiarFormulario = () => {
        setFormulario(formularioInicial);
        setUsuarioEditando(null);
        setNuevaPassword('');
        setError('');
        setMensaje('');
    };

    const editarUsuario = (usuario: Usuario) => {
        const id = obtenerId(usuario);

        if (id === undefined || id === null) {
            setError('El usuario no tiene un identificador válido.');
            return;
        }

        setUsuarioEditando(String(id));
        setFormulario(normalizarUsuario(usuario));
        setError('');
        setMensaje('');
        setNuevaPassword('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const guardarUsuario = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        setError('');
        setMensaje('');

        try {
            const editando = usuarioEditando !== null;
            const url = editando
                ? apiUrl(`admin/users/${encodeURIComponent(usuarioEditando)}`)
                : apiUrl('admin/users');

const payload: Record<string, unknown> = {
    ...(editando ? { id_user: Number(usuarioEditando) } : {}),
    numEmpleado: formulario.numEmpleado.trim(),
    origen: formulario.origen,
    firstName: formulario.firstName.trim(),
    lastName: formulario.lastName.trim(),
    middleName: formulario.middleName.trim(),
    nivel: formulario.nivel.trim(),
    unidad: formulario.unidad.trim(),
    email: formulario.email.trim(),
    idType: Number(formulario.idType),
    active: formulario.active ? 1 : 0,
};

if (editando && nuevaPassword.trim()) {
    payload.nuevaPassword = nuevaPassword;
}

            if (editando && nuevaPassword.trim()) {
                payload.nuevaPassword = nuevaPassword;
            }
            const response = await fetch(url, {
                method: editando ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token()}`,
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                const errores = data.errors
                    ? Object.values(data.errors).flat().join(' ')
                    : data.message;

                throw new Error(errores || 'No se pudo guardar el usuario.');
            }

            setMensaje(
                data.message ||
                (editando
                    ? 'Usuario actualizado correctamente.'
                    : 'Usuario creado correctamente.')
            );

            limpiarFormulario();
            await cargarUsuarios();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Error al guardar el usuario.'
            );
        } finally {
            setGuardando(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '9px 10px',
        border: '1px solid #ced4da',
        borderRadius: '5px',
        boxSizing: 'border-box',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 600,
    };

    return (
        <div className="gestor-container">
            <div className="gestor-header">
                <h2 className="gestor-title">Gestión de Usuarios</h2>
                <p className="gestor-subtitle">
                    Consulta, registra y modifica usuarios del sistema.
                </p>
            </div>

            <div className="gestor-card">
                <h3 style={{ marginTop: 0 }}>
                    {usuarioEditando ? 'Modificar usuario' : 'Alta de usuario'}
                </h3>

                {error && (
                    <div role="alert" style={{ color: '#842029', marginBottom: 12 }}>
                        {error}
                    </div>
                )}

                {mensaje && (
                    <div role="status" style={{ color: '#155724', marginBottom: 12 }}>
                        {mensaje}
                    </div>
                )}

                <form onSubmit={guardarUsuario}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 14,
                        }}
                    >
                        <div>
                            <label style={labelStyle} htmlFor="usuario-origen">
                                Origen
                            </label>
                            <select
                                className="users-input"
                                id="usuario-origen"
                                style={inputStyle}
                                value={formulario.origen}
                                onChange={(e) => {
                                    actualizarCampo('origen', e.target.value as Origen);
                                    actualizarCampo('firstName', '');
                                    actualizarCampo('lastName', '');
                                    actualizarCampo('middleName', '');
                                    actualizarCampo('nivel', '');
                                    actualizarCampo('unidad', '');
                                }}
                            >
                                <option value="secretaría">Secretaría</option>
                                <option value="guardia">Guardia Nacional</option>
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle} htmlFor="usuario-numero">
                                Número de empleado
                            </label>
                            <div className="users-employee-field">
                                <input
                                    id="usuario-numero"
                                    className="users-input"
                                    value={formulario.numEmpleado}
                                    onChange={(e) => actualizarCampo('numEmpleado', e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="users-button"
                                    onClick={validarEmpleado}
                                    disabled={consultandoEmpleado}
                                >
                                    {consultandoEmpleado ? 'Validando…' : 'Validar'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle} htmlFor="usuario-nombre">
                                Nombre(s)
                            </label>
                            <input
                                id="usuario-nombre"
                                className="users-input"
                                style={inputStyle}
                                value={formulario.firstName}
                                onChange={(e) => actualizarCampo('firstName', e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label style={labelStyle} htmlFor="usuario-apellido-paterno">
                                Apellido paterno
                            </label>
                            <input
                                id="usuario-apellido-paterno"
                                className="users-input"
                                style={inputStyle}
                                value={formulario.lastName}
                                onChange={(e) => actualizarCampo('lastName', e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label style={labelStyle} htmlFor="usuario-apellido-materno">
                                Apellido materno
                            </label>
                            <input
                                id="usuario-apellido-materno"
                                className="users-input"
                                style={inputStyle}
                                value={formulario.middleName}
                                onChange={(e) => actualizarCampo('middleName', e.target.value)}
                            />
                        </div>

                        <div>
                            <label style={labelStyle} htmlFor="usuario-nivel">
                                Nivel
                            </label>
                            <input
                                id="usuario-nivel"
                                className="users-input"
                                style={inputStyle}
                                value={formulario.nivel}
                                onChange={(e) => actualizarCampo('nivel', e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label style={labelStyle} htmlFor="usuario-unidad">
                                Unidad
                            </label>
                            <input
                                id="usuario-unidad"
                                className="users-input"
                                style={inputStyle}
                                value={formulario.unidad}
                                onChange={(e) => actualizarCampo('unidad', e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label style={labelStyle} htmlFor="usuario-email">
                                Correo
                            </label>
                            <input
                                id="usuario-email"
                                className="users-input"
                                type="email"
                                style={inputStyle}
                                value={formulario.email}
                                onChange={(e) => actualizarCampo('email', e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label style={labelStyle} htmlFor="usuario-tipo">
                                Tipo de usuario
                            </label>
                            <select
                                id="usuario-tipo"
                                className="users-input"
                                style={inputStyle}
                                value={formulario.idType}
                                onChange={(e) => actualizarCampo('idType', e.target.value)}
                                required
                            >
                                <option value="1">Administrador</option>
                                <option value="2">Gestor de Prestaciones</option>
                                <option value="3">Enlace</option>
                            </select>
                        </div>

                        {!usuarioEditando && (
                            <div>
                                <label style={labelStyle} htmlFor="usuario-password">
                                    Contraseña inicial
                                </label>
                                <input
                                    id="usuario-password"
                                    type="password"
                                    className="users-input"
                                    style={inputStyle}
                                    value={formulario.password}
                                    onChange={(e) => actualizarCampo('password', e.target.value)}
                                    minLength={8}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        )}

                        {usuarioEditando && (
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginTop: 25,
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={formulario.active}
                                    onChange={(e) =>
                                        actualizarCampo('active', e.target.checked)
                                    }
                                />
                                Usuario activo
                            </label>
                        )}
                        {usuarioEditando && (
                            <div className="users-password-field">
                                <label htmlFor="nuevaPassword">Nueva contraseña</label>
                                <input
                                    id="nuevaPassword"
                                    type="password"
                                    className="users-input"
                                    value={nuevaPassword}
                                    onChange={(e) => setNuevaPassword(e.target.value)}
                                    autoComplete="new-password"
                                    minLength={8}
                                />
                                <small>Escribe una contraseña solo si deseas cambiarla.</small>
                            </div>
                        )}
                    </div>

                    <div className="users-form-actions">
                        <button
                            type="submit"
                            className="users-button users-button-primary"
                            disabled={guardando}
                        >
                            {guardando ? 'Guardando…' : 'Guardar cambios'}
                        </button>

                        {usuarioEditando && (
                            <button
                                type="button"
                                className="users-button users-button-secondary"
                                onClick={limpiarFormulario}
                            >
                                Cancelar edición
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="gestor-card">
                <div
                    style={{
                        display: 'flex',
                        gap: 12,
                        flexWrap: 'wrap',
                        alignItems: 'end',
                    }}
                >
                    <div style={{ flex: '1 1 260px' }}>
                        <label style={labelStyle} htmlFor="buscar-usuarios">
                            Buscar usuarios
                        </label>
                        <input
                            id="buscar-usuarios"
                            style={inputStyle}
                            placeholder="Nombre, número, correo, unidad..."
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                                setPagina(1);
                            }}
                        />
                    </div>

                    <div style={{ minWidth: 190 }}>
                        <label style={labelStyle} htmlFor="filtro-origen">
                            Filtrar por origen
                        </label>
                        <select
                            id="filtro-origen"
                            style={inputStyle}
                            value={filtroOrigen}
                            onChange={(e) => {
                                setFiltroOrigen(e.target.value);
                                setPagina(1);
                            }}
                        >
                            <option value="">Todos los orígenes</option>
                            <option value="secretaría">Secretaría</option>
                            <option value="guardia">Guardia Nacional</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        className="btn-primary"
                        onClick={cargarUsuarios}
                        disabled={cargando}
                    >
                        Actualizar lista
                    </button>
                </div>
            </div>

            {cargando ? (
                <div className="gestor-loading">Cargando usuarios...</div>
            ) : (
                <div className="gestor-table-card">
                    <div className="gestor-table-wrapper">
                        <table className="gestor-table">
                            <thead>
                                <tr>
                                    <th>Núm. empleado</th>
                                    <th>Nombre completo</th>
                                    <th>Origen</th>
                                    <th>Tipo</th>
                                    <th>Unidad</th>
                                    <th>Correo</th>
                                    <th>Estatus</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {usuariosPagina.map((usuario, index) => {
                                    const id = obtenerId(usuario);
                                    const activo =
                                        Number(usuario.active) === 1 || usuario.active === true;

                                    return (
                                        <tr
                                            key={String(id ?? index)}
                                            className={
                                                index % 2 === 0 ? 'gestor-tr-even' : 'gestor-tr-odd'
                                            }
                                        >
                                            <td className="gestor-td gestor-num-emp">
                                                {obtenerNumero(usuario) || '—'}
                                            </td>
                                            <td className="gestor-td">{obtenerNombre(usuario) || '—'}</td>
                                            <td className="gestor-td">
                                                {usuario.origen === 'guardia'
                                                    ? 'Guardia Nacional'
                                                    : 'Secretaría'}
                                            </td>
                                            <td className="gestor-td">
                                                {usuario.typeuser ??
                                                    ({
                                                        1: 'Administrador',
                                                        2: 'Gestor de Prestaciones',
                                                        3: 'Enlace',
                                                    }[
                                                        Number(usuario.idType ?? usuario.idtype) as 1 | 2 | 3
                                                    ] ??
                                                        '—')}
                                            </td>
                                            <td className="gestor-td">{usuario.unidad || '—'}</td>
                                            <td className="gestor-td">{usuario.email || '—'}</td>
                                            <td className="gestor-td-center">
                                                <span
                                                    style={{
                                                        color: activo ? '#155724' : '#856404',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="gestor-td-center">
                                                <button
                                                    type="button"
                                                    className="btn-primary"
                                                    onClick={() => editarUsuario(usuario)}
                                                >
                                                    Modificar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {usuariosFiltrados.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="gestor-empty-row">
                                            No se encontraron usuarios.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                            flexWrap: 'wrap',
                            padding: 12,
                        }}
                    >
                        <span>
                            {usuariosFiltrados.length === 0
                                ? 'Sin resultados'
                                : `Mostrando ${(pagina - 1) * porPagina + 1}–${Math.min(
                                    pagina * porPagina,
                                    usuariosFiltrados.length
                                )} de ${usuariosFiltrados.length}`}
                        </span>

                        <label>
                            Filas por página:{' '}
                            <select
                                value={porPagina}
                                onChange={(e) => {
                                    setPorPagina(Number(e.target.value));
                                    setPagina(1);
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </label>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                                disabled={pagina <= 1}
                            >
                                Anterior
                            </button>
                            <span>
                                Página {pagina} de {totalPaginas}
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setPagina((actual) => Math.min(totalPaginas, actual + 1))
                                }
                                disabled={pagina >= totalPaginas}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}