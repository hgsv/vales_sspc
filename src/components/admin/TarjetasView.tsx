import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS } from '../../config/api';
import '../gestor/GestorView.css';

interface TarjetasViewProps {
    idRegister: number | string;
    onVolver: () => void;
}

type Datos = Record<string, unknown>;

interface ApiResponse {
    status?: boolean;
    message?: string;
    data?: {
        empleado?: Datos;
        tarjetas?: Datos[];
        estatusDisponibles?: Datos[];
    };
}

const ESTATUS_TARJETA: Datos[] = [
    { idStatus: 1, status: 'Pendiente' },
    { idStatus: 2, status: 'Entregado' },
    { idStatus: 3, status: 'Sustituida' },
    { idStatus: 4, status: 'Cancelada' },
];

const leer = (objeto: Datos | undefined, ...claves: string[]): unknown => {
    if (!objeto) return '';

    for (const clave of claves) {
        const valor = objeto[clave];

        if (valor !== undefined && valor !== null) {
            return valor;
        }
    }

    return '';
};

const texto = (valor: unknown, alternativo = '—'): string => {
    if (valor === undefined || valor === null || valor === '') {
        return alternativo;
    }

    return String(valor);
};

const fecha = (valor: unknown): string => {
    if (!valor) return '—';

    const parsed = new Date(String(valor));

    if (Number.isNaN(parsed.getTime())) {
        return String(valor);
    }

    return parsed.toLocaleString();
};

const obtenerIdEstatus = (estatus: Datos): string =>
    String(leer(estatus, 'idStatus', 'IDSTATUS') || '');

const obtenerNombreEstatus = (estatus: Datos): string =>
    String(leer(estatus, 'status', 'STATUS') || '');

export function TarjetasView({
    idRegister,
    onVolver,
}: TarjetasViewProps) {
    const [empleado, setEmpleado] = useState<Datos | null>(null);
    const [tarjetas, setTarjetas] = useState<Datos[]>([]);
    const [estatusDisponibles, setEstatusDisponibles] = useState<Datos[]>([]);
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [actualizandoId, setActualizandoId] = useState<string | null>(null);
    const [error, setError] = useState('');

    const [folioCard, setFolioCard] = useState('');
    const [cuenta, setCuenta] = useState('');
    const [idStatus, setIdStatus] = useState('1');
    const [observaciones, setObservaciones] = useState('');

    const opcionesEstatus =
        estatusDisponibles.length > 0
            ? estatusDisponibles
            : ESTATUS_TARJETA;

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(
                `${API_ENDPOINTS.MAIN}/gestor/tarjetas/empleado/${encodeURIComponent(
                    String(idRegister)
                )}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                        Accept: 'application/json',
                    },
                }
            );

            const result = (await response.json()) as ApiResponse;

            if (!response.ok || !result.status || !result.data?.empleado) {
                throw new Error(
                    result.message || 'No se pudo cargar el módulo de tarjetas.'
                );
            }

            const listaEstatus = result.data.estatusDisponibles ?? [];

            setEmpleado(result.data.empleado);
            setTarjetas(result.data.tarjetas ?? []);
            setEstatusDisponibles(listaEstatus);

            setIdStatus((actual) => {
                if (
                    actual &&
                    listaEstatus.some(
                        (estatus) => obtenerIdEstatus(estatus) === actual
                    )
                ) {
                    return actual;
                }

                return listaEstatus.length > 0
                    ? obtenerIdEstatus(listaEstatus[0])
                    : '1';
            });
        } catch (e) {
            console.error('Error al cargar las tarjetas del empleado:', e);
            setError(
                e instanceof Error
                    ? e.message
                    : 'Ocurrió un error al cargar la información.'
            );
        } finally {
            setLoading(false);
        }
    }, [idRegister]);

    useEffect(() => {
        void cargarDatos();
    }, [cargarDatos]);

    const cuentaInicial = texto(
        leer(empleado ?? undefined, 'CUENTAINICIAL', 'cuentainicial'),
        ''
    );

    const tarjetasVisibles = useMemo(() => {
        if (!cuentaInicial) return tarjetas;

        const cuentaInicialYaRegistrada = tarjetas.some(
            (tarjeta) =>
                String(leer(tarjeta, 'cuenta', 'CUENTA')) === cuentaInicial
        );

        if (cuentaInicialYaRegistrada) return tarjetas;

        const cuentaInicialComoTarjeta: Datos = {
            idCard: `inicial-${idRegister}`,
            cuenta: cuentaInicial,
            folioCard: '',
            status: 'Cuenta inicial',
            observaciones: 'Cuenta inicial del registro del empleado',
            CREATED_AT: leer(empleado ?? undefined, 'CREATED_AT', 'created_at'),
            esCuentaInicial: true,
        };

        return [cuentaInicialComoTarjeta, ...tarjetas];
    }, [cuentaInicial, empleado, idRegister, tarjetas]);

    const registrarReemplazo = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();
        setError('');

        if (!folioCard.trim() || !cuenta.trim() || !idStatus) {
            setError('Completa el folio, la cuenta nueva y el estatus.');
            return;
        }

        setGuardando(true);

        try {
            const response = await fetch(
                `${API_ENDPOINTS.MAIN}/gestor/tarjetas`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({
                        IDREGISTER: idRegister,
                        folioCard: folioCard.trim(),
                        cuenta: cuenta.trim(),
                        idStatus: Number(idStatus),
                        observaciones: observaciones.trim() || null,
                    }),
                }
            );

            const result = (await response.json()) as ApiResponse;

            if (!response.ok || !result.status) {
                throw new Error(
                    result.message || 'No se pudo registrar la tarjeta.'
                );
            }

            setFolioCard('');
            setCuenta('');
            setObservaciones('');
            await cargarDatos();
        } catch (e) {
            console.error('Error al registrar la tarjeta de reemplazo:', e);
            setError(
                e instanceof Error
                    ? e.message
                    : 'Error al registrar la tarjeta.'
            );
        } finally {
            setGuardando(false);
        }
    };

    const cambiarEstatus = async (
        idCard: number | string,
        nuevoEstatus: number
    ) => {
        const clave = String(idCard);
        setActualizandoId(clave);
        setError('');

        try {
            const response = await fetch(
                `${API_ENDPOINTS.MAIN}/gestor/tarjetas/${encodeURIComponent(
                    clave
                )}/estatus`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({ idStatus: nuevoEstatus }),
                }
            );

            const result = (await response.json()) as ApiResponse;

            if (!response.ok || !result.status) {
                throw new Error(
                    result.message || 'No se pudo actualizar el estatus.'
                );
            }

            await cargarDatos();
        } catch (e) {
            console.error('Error al actualizar el estatus de la tarjeta:', e);
            setError(
                e instanceof Error
                    ? e.message
                    : 'Error al actualizar el estatus.'
            );
        } finally {
            setActualizandoId(null);
        }
    };

    return (
        <div className="gestor-container">
            <div
                className="gestor-header"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '15px',
                }}
            >
                <div>
                    <h2 className="gestor-title">Manejo de tarjetas</h2>
                    <p className="gestor-subtitle">
                        Información del empleado, pensiones e historial de tarjetas.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={() => void cargarDatos()}
                        disabled={loading}
                    >
                        🔄 Actualizar
                    </button>

                    <button
                        type="button"
                        className="btn-primary"
                        onClick={onVolver}
                    >
                        ← Volver a la consulta
                    </button>
                </div>
            </div>

            {error && (
                <div className="gestor-card" role="alert" style={{ color: '#b91c1c' }}>
                    {error}
                </div>
            )}

            {loading && !empleado ? (
                <div className="gestor-loading">
                    Cargando datos del empleado...
                </div>
            ) : empleado ? (
                <>
                    <div className="gestor-card">
                        <h3>Información del empleado</h3>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: '12px 20px',
                            }}
                        >
                            <div>
                                <strong>Número de empleado:</strong>{' '}
                                {texto(leer(empleado, 'NUMEMPLEADO', 'numempleado'))}
                            </div>
                            <div>
                                <strong>Nombre completo:</strong>{' '}
                                {texto(leer(empleado, 'NOMBRECOMPLETO', 'nombrecompleto'))}
                            </div>
                            <div>
                                <strong>UR:</strong>{' '}
                                {texto(leer(empleado, 'UR', 'ur'))}
                            </div>
                            <div>
                                <strong>RFC:</strong>{' '}
                                {texto(leer(empleado, 'RFC', 'rfc'))}
                            </div>
                            <div>
                                <strong>CURP:</strong>{' '}
                                {texto(leer(empleado, 'CURP', 'curp'))}
                            </div>
                            <div>
                                <strong>NSS:</strong>{' '}
                                {texto(leer(empleado, 'NSS', 'nss'))}
                            </div>
                            <div>
                                <strong>Nivel:</strong>{' '}
                                {texto(leer(empleado, 'NIVEL', 'nivel'))}
                            </div>
                            <div>
                                <strong>Enlace:</strong>{' '}
                                {texto(leer(empleado, 'IDENLACE', 'idenlace'))}
                            </div>
                            <div>
                                <strong>Cuenta inicial:</strong>{' '}
                                {texto(cuentaInicial)}
                            </div>
                            <div>
                                <strong>Estatus del registro:</strong>{' '}
                                {texto(leer(empleado, 'IDSTATUS', 'idstatus'))}
                            </div>
                        </div>
                    </div>

                    <div className="gestor-card">
                        <h3>Registrar tarjeta de reemplazo</h3>
                        <form onSubmit={registrarReemplazo}>
                            <div
                                className="gestor-input-wrapper"
                                style={{ flexWrap: 'wrap', gap: '12px' }}
                            >
                                <div>
                                    <label className="gestor-input-label" htmlFor="folioCard">
                                        FOLIO DE TARJETA
                                    </label>
                                    <input
                                        id="folioCard"
                                        className="gestor-text-input"
                                        value={folioCard}
                                        onChange={(e) => setFolioCard(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="gestor-input-label" htmlFor="cuentaCard">
                                        CUENTA NUEVA
                                    </label>
                                    <input
                                        id="cuentaCard"
                                        className="gestor-text-input"
                                        value={cuenta}
                                        onChange={(e) => setCuenta(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="gestor-input-label" htmlFor="estatusCard">
                                        ESTATUS
                                    </label>
                                    <select
                                        id="estatusCard"
                                        className="gestor-text-input"
                                        value={idStatus}
                                        onChange={(e) => setIdStatus(e.currentTarget.value)}
                                        required
                                    >
                                        <option value="1">Pendiente</option>
                                        <option value="2">Entregado</option>
                                        <option value="3">Sustituida</option>
                                        <option value="4">Cancelada</option>
                                    </select>
                                </div>

                                <div>
                                    <label
                                        className="gestor-input-label"
                                        htmlFor="observacionesCard"
                                    >
                                        OBSERVACIONES
                                    </label>
                                    <input
                                        id="observacionesCard"
                                        className="gestor-text-input"
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        placeholder="Ej. Reposición por extravío"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={guardando}
                                >
                                    {guardando ? 'Guardando...' : 'Registrar reemplazo'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="gestor-table-card">
                        <div className="gestor-table-wrapper">
                            <table className="gestor-table">
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Cuenta</th>
                                        <th>Folio</th>
                                        <th>Estatus</th>
                                        <th>Observaciones</th>
                                        <th>Creada</th>
                                        <th>Actualizada</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {tarjetasVisibles.map((tarjeta, index) => {
                                        const idCard = leer(tarjeta, 'idCard', 'IDCARD');
                                        const esCuentaInicial = Boolean(tarjeta.esCuentaInicial);
                                        const estatusActual = String(
                                            leer(tarjeta, 'idStatus', 'IDSTATUS')
                                        );

                                        return (
                                            <tr
                                                key={String(idCard || index)}
                                                className={
                                                    index % 2 === 0 ? 'gestor-tr-even' : 'gestor-tr-odd'
                                                }
                                            >
                                                <td className="gestor-td">
                                                    {esCuentaInicial
                                                        ? 'Cuenta inicial'
                                                        : 'Tarjeta registrada'}
                                                </td>

                                                <td className="gestor-td gestor-mono">
                                                    {texto(leer(tarjeta, 'cuenta', 'CUENTA'))}
                                                </td>

                                                <td className="gestor-td gestor-mono">
                                                    {texto(leer(tarjeta, 'foliocard', 'FOLIOCARD'))}
                                                </td>

                                                <td className="gestor-td-center">
                                                    {esCuentaInicial ? (
                                                        'Sin registro de tarjeta'
                                                    ) : (
                                                        <select
                                                            aria-label={`Cambiar estatus de tarjeta ${String(idCard)}`}
                                                            value={estatusActual}
                                                            disabled={
                                                                !idCard || actualizandoId === String(idCard)
                                                            }
                                                            onChange={(e) => {
                                                                if (idCard) {
                                                                    void cambiarEstatus(
                                                                        idCard as string | number,
                                                                        Number(e.target.value)
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            {opcionesEstatus.map((estatus, indexEstatus) => {
                                                                const estatusId = obtenerIdEstatus(estatus);

                                                                return (
                                                                    <option
                                                                        key={estatusId || indexEstatus}
                                                                        value={estatusId}
                                                                    >
                                                                        {obtenerNombreEstatus(estatus)}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    )}
                                                </td>

                                                <td className="gestor-td">
                                                    {texto(
                                                        leer(tarjeta, 'observaciones', 'OBSERVACIONES')
                                                    )}
                                                </td>

                                                <td className="gestor-td">
                                                    {fecha(leer(tarjeta, 'CREATED_AT', 'created_at'))}
                                                </td>

                                                <td className="gestor-td">
                                                    {fecha(leer(tarjeta, 'UPDATED_AT', 'updated_at'))}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {!loading && tarjetasVisibles.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="gestor-empty-row">
                                                No hay cuenta inicial ni tarjetas registradas para este
                                                empleado.
                                            </td>
                                        </tr>
                                    )}

                                    {loading && (
                                        <tr>
                                            <td colSpan={7} className="gestor-empty-row">
                                                Actualizando información...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}