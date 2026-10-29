import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from '../../config/api';
import '../gestor/GestorView.css';

interface TarjetasViewProps {
  idRegister: number | string;
  onVolver: () => void;
  idType?: number | null;
}

type Datos = Record<string, unknown>;

interface ApiResponse {
  status?: boolean;
  message?: string;
  data?: {
    empleado?: Datos;
    pensionados?: Datos[];
    tarjetas?: Datos[];
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

    if (valor !== undefined && valor !== null) return valor;
  }

  return '';
};

const texto = (valor: unknown, alternativo = '—'): string => {
  if (valor === undefined || valor === null || valor === '') return alternativo;
  return String(valor);
};

const moneda = (valor: unknown): string => {
  if (valor === undefined || valor === null || valor === '') return 'N/A';

  const numero = typeof valor === 'number'
    ? valor
    : Number(String(valor).replace(/[,$\s]/g, ''));

  if (!Number.isFinite(numero)) return String(valor);

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(numero);
};

const fecha = (valor: unknown): string => {
  if (!valor) return '—';

  const parsed = new Date(String(valor));

  return Number.isNaN(parsed.getTime())
    ? String(valor)
    : parsed.toLocaleString();
};

const obtenerIdEstatus = (estatus: Datos): string =>
  String(leer(estatus, 'idStatus', 'IDSTATUS', 'idstatus') || '');

const obtenerNombreEstatus = (estatus: Datos): string =>
  String(leer(estatus, 'status', 'STATUS', 'Status') || '');

export function TarjetasView({ idRegister, onVolver, idType }: TarjetasViewProps) {
  const [empleado, setEmpleado] = useState<Datos | null>(null);
  const [tarjetas, setTarjetas] = useState<Datos[]>([]);
  const [pensionados, setPensionados] = useState<Datos[]>([]);
  const [pensionadosDisponibles, setPensionadosDisponibles] = useState(false);
  const [descargandoPensionados, setDescargandoPensionados] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [folioCard, setFolioCard] = useState('');
  const [cuenta, setCuenta] = useState('');
  const [idStatus, setIdStatus] = useState('1');
  const [observaciones, setObservaciones] = useState('');

  const opcionesEstatus = ESTATUS_TARJETA;

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

      setEmpleado(result.data.empleado);
      setPensionadosDisponibles(Array.isArray(result.data.pensionados));
      setPensionados(Array.isArray(result.data.pensionados) ? result.data.pensionados : []);
      setTarjetas(result.data.tarjetas ?? []);
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

  const descargarFormatoPensionados = async () => {
    setDescargandoPensionados(true);
    setError('');

    try {
      const response = await fetch(
        `${API_ENDPOINTS.MAIN}/gestor/vales/descargar-formatos-pensionados/${encodeURIComponent(String(idRegister))}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            Accept: 'application/pdf, application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No se pudo generar el PDF de pensionados.');
      }

      const archivo = URL.createObjectURL(await response.blob());
      const enlace = document.createElement('a');
      const numeroEmpleado = texto(leer(empleado ?? undefined, 'NUMEMPLEADO', 'numempleado'), String(idRegister));
      enlace.href = archivo;
      enlace.download = `pensionados_${numeroEmpleado}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(archivo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al descargar el PDF de pensionados.');
    } finally {
      setDescargandoPensionados(false);
    }
  };

  const cuentaInicial = texto(
    leer(empleado ?? undefined, 'CUENTAINICIAL', 'cuentainicial'),
    ''
  );

  const observacionInicialActual = texto(
    leer(empleado ?? undefined, 'OBSERVACIONINICIAL', 'observacioninicial', 'ObservacionInicial'),
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
      observaciones: observacionInicialActual !== '—' ? observacionInicialActual : 'Cuenta inicial del registro del empleado',
      CREATED_AT: leer(empleado ?? undefined, 'CREATED_AT', 'created_at'),
      esCuentaInicial: true,
    };

    return [cuentaInicialComoTarjeta, ...tarjetas];
  }, [cuentaInicial, empleado, idRegister, tarjetas, observacionInicialActual]);

  const registrarReemplazo = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setError('');

    const formulario = new FormData(e.currentTarget);
    const folio = String(formulario.get('folioCard') ?? '').trim();
    const cuentaNueva = String(formulario.get('cuenta') ?? '').trim();
    const estatus = String(formulario.get('idStatus') ?? '').trim();
    const notas = String(formulario.get('observaciones') ?? '').trim();

    const faltan: string[] = [];

    if (!folio) faltan.push('folio de tarjeta');
    if (!cuentaNueva) faltan.push('cuenta nueva');
    if (!estatus) faltan.push('estatus');

    if (faltan.length > 0) {
      setError(`Completa: ${faltan.join(', ')}.`);
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch(`${API_ENDPOINTS.MAIN}/gestor/tarjetas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          IDREGISTER: idRegister,
          folioCard: folio,
          cuenta: cuentaNueva,
          idStatus: Number(estatus),
          observaciones: notas || null,
        }),
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.status) {
        throw new Error(
          result.message || 'No se pudo registrar la tarjeta.'
        );
      }

      setFolioCard('');
      setCuenta('');
      setObservaciones('');
      setIdStatus('1');

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

  const editarObservacionInicial = async () => {
    const { value: observacionTexto } = await Swal.fire({
      title: 'Editar Observación Inicial',
      input: 'textarea',
      inputLabel: 'Comentario u observación',
      inputValue: observacionInicialActual !== '—' ? observacionInicialActual : '',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#800020',
    });

    if (observacionTexto === undefined) return;

    setGuardando(true);
    setError('');

    try {
      const response = await fetch(`${API_ENDPOINTS.MAIN}/gestor/vales/observacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          idRegister: idRegister,
          observacioninicial: observacionTexto,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || 'No se pudo guardar la observación.');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Actualizado',
        text: 'La observación inicial se actualizó correctamente.',
        confirmButtonColor: '#800020',
      });

      await cargarDatos();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar la observación.');
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
        <div className="gestor-loading">Cargando datos del empleado...</div>
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
              <div><strong>Número de empleado:</strong> {texto(leer(empleado, 'NUMEMPLEADO', 'numempleado'))}</div>
              <div><strong>Nombre completo:</strong> {texto(leer(empleado, 'NOMBRECOMPLETO', 'nombrecompleto'))}</div>
              <div><strong>UR:</strong> {texto(leer(empleado, 'UR', 'ur'))}</div>
              <div><strong>RFC:</strong> {texto(leer(empleado, 'RFC', 'rfc'))}</div>
              <div><strong>CURP:</strong> {texto(leer(empleado, 'CURP', 'curp'))}</div>
              <div><strong>NSS:</strong> {texto(leer(empleado, 'NSS', 'nss'))}</div>
              <div><strong>Nivel:</strong> {texto(leer(empleado, 'NIVEL', 'nivel'))}</div>
              <div><strong>Enlace:</strong> {texto(leer(empleado, 'IDENLACE', 'idenlace'))}</div>
              <div><strong>Cuenta inicial:</strong> {texto(cuentaInicial)}</div>
              <div><strong>Origen:</strong> {texto(leer(empleado, 'ORIGEN', 'origen'))}</div>
              <div><strong>Estatus del registro:</strong> {texto(leer(empleado, 'IDSTATUS', 'idstatus'))}</div>
              <div><strong>Pensiones:</strong> {texto(leer(empleado, 'PENSION', 'pension'), 'N/A')}</div>
              <div><strong>Importe asignado:</strong> {moneda(leer(empleado, 'IMPORTE', 'importe'))}</div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>{pensionadosDisponibles ? `Pensionados registrados (${pensionados.length})` : 'Pensionados registrados'}</h3>
                {pensionadosDisponibles && pensionados.length > 0 && (
                  <button type="button" className="btn-primary" onClick={() => void descargarFormatoPensionados()} disabled={descargandoPensionados}>
                    {descargandoPensionados ? 'Generando PDF...' : '📄 Descargar PDF de pensionados'}
                  </button>
                )}
              </div>
              {!pensionadosDisponibles ? (
                <p>El servicio de tarjetas no devolvió el detalle de pensionados. Actualiza o reinicia el backend.</p>
              ) : pensionados.length > 0 ? (
                <div className="gestor-table-wrapper" style={{ marginTop: 12, overflowX: 'auto' }}>
                  <table className="gestor-table">
                    <thead>
                      <tr><th>Nombre del pensionado</th><th>CURP</th><th>RFC</th><th>Cuenta</th><th>Porcentaje</th></tr>
                    </thead>
                    <tbody>
                      {pensionados.map((pensionado, index) => (
                        <tr key={String(leer(pensionado, 'idPension', 'idpension', 'IDPENSION') || index)}>
                          <td className="gestor-td">{texto(leer(pensionado, 'nombrePensionado', 'nombrepensionado', 'NOMBREPENSIONADO'))}</td>
                          <td className="gestor-td gestor-mono">{texto(leer(pensionado, 'curp', 'CURP'))}</td>
                          <td className="gestor-td gestor-mono">{texto(leer(pensionado, 'rfc', 'RFC'))}</td>
                          <td className="gestor-td">{texto(leer(pensionado, 'cuenta', 'CUENTA'))}</td>
                          <td className="gestor-td">{texto(leer(pensionado, 'porcentaje', 'PORCENTAJE'))}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ marginBottom: 0 }}>No hay pensionados registrados para este empleado.</p>
              )}
            </div>
          </div>

          {/* Sección de reemplazo restringida exclusivamente a idType === 1 */}
          {idType === 1 && (
            <div className="gestor-card">
              <h3>Registrar tarjeta de reemplazo</h3>
              <p>
                Captura los datos de la nueva tarjeta, por ejemplo, cuando la
                anterior se extravíe.
              </p>

              <form onSubmit={registrarReemplazo}>
                <div
                  className="gestor-input-wrapper"
                  style={{ flexWrap: 'wrap', gap: '12px' }}
                >
                  <div>
                    <label className="gestor-input-label" htmlFor="folioCard">
                      CUENTA VIGENTE
                    </label>
                    <input
                      id="folioCard"
                      name="folioCard"
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
                      name="cuenta"
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
                      name="idStatus"
                      className="gestor-text-input"
                      value={idStatus}
                      onChange={(e) => setIdStatus(e.currentTarget.value)}
                      required
                    >
                      {opcionesEstatus.map((estatus, index) => {
                        const estatusId = obtenerIdEstatus(estatus);

                        return (
                          <option key={estatusId || index} value={estatusId}>
                            {obtenerNombreEstatus(estatus)}
                          </option>
                        );
                      })}
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
                      name="observaciones"
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
          )}

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
                      leer(tarjeta, 'idStatus', 'IDSTATUS', 'idstatus')
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                              <span>Sin registro de tarjeta</span>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#b91c1c', borderColor: '#b91c1c' }}
                                  onClick={() => void editarObservacionInicial()}
                                  disabled={guardando}
                                >
                                    🚨 Reportar Robo/Extravío
                                </button>
                              </div>
                            </div>
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
  {esCuentaInicial 
    ? texto(observacionInicialActual !== '—' ? observacionInicialActual : leer(tarjeta, 'observaciones', 'OBSERVACIONES'))
    : texto(leer(tarjeta, 'observaciones', 'OBSERVACIONES'))
  }
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