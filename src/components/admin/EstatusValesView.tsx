import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { API_ENDPOINTS, apiUrl } from '../../config/api';
import '../gestor/GestorView.css';
import { TarjetasView } from './TarjetasView';


interface RegistroVale {
  idRegister?: number | string;
  idregister?: number | string;
  IDREGISTER?: number | string;

  idStatus?: number | string;
  idstatus?: number | string;
  IDSTATUS?: number | string;

  NOMBRECOMPLETO?: string;
  nombrecompleto?: string;
  nombreCompleto?: string;

  numEmpleado?: string;
  numempleado?: string;
  NUMEMPLEADO?: string;

  nomEmpleado?: string;
  nomempleado?: string;
  NOMEMPLEADO?: string;

  appEmpleado?: string;
  appempleado?: string;
  APPEMPLEADO?: string;

  idEnlace?: number | string;
  idenlace?: number | string;
  IDENLACE?: number | string;

  origen?: string;
  ORIGEN?: string;

  rfc?: string;
  RFC?: string;
  curp?: string;
  CURP?: string;

  cuentaInicial?: string;
  cuentainicial?: string;
  CUENTAINICIAL?: string;

  pension?: string | number | null;
  PENSION?: string | number | null;
}

type CampoFiltro = 'numero' | 'nombre' | 'cuenta' | 'estatus';

export function EstatusValesView({ idType }: { idType?: number | null }) {
  const [registros, setRegistros] = useState<RegistroVale[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [registroTarjetas, setRegistroTarjetas] =
    useState<RegistroVale | null>(null);
  const [filtros, setFiltros] = useState<Record<CampoFiltro, string>>({
    numero: '',
    nombre: '',
    cuenta: '',
    estatus: '',
  });

  const [seleccionadosIds, setSeleccionadosIds] = useState<Set<string>>(
    () => new Set()
  );
  const [descargandoFormatos, setDescargandoFormatos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  const obtenerId = (reg: RegistroVale) =>
    reg.idRegister ?? reg.idregister ?? reg.IDREGISTER;

  const obtenerEstatus = (reg: RegistroVale) =>
    Number(reg.idStatus ?? reg.idstatus ?? reg.IDSTATUS);

  const obtenerNombreEstatus = (estatus: number) => {
    switch (estatus) {
      case 1:
        return 'Pendiente';
      case 2:
        return 'Entregada';
      case 3:
        return 'Sustituida';
      case 4:
        return 'Cancelada';
      default:
        return 'Desconocido';
    }
  };

  const obtenerNumeroEmpleado = (reg: RegistroVale) =>
    reg.numEmpleado ?? reg.numempleado ?? reg.NUMEMPLEADO ?? '';

  const obtenerNombreCompleto = (reg: RegistroVale) => {
    const nombreGuardado =
      reg.NOMBRECOMPLETO ?? reg.nombrecompleto ?? reg.nombreCompleto;

    if (nombreGuardado?.trim()) {
      return nombreGuardado.trim();
    }

    const nombre = reg.NOMEMPLEADO ?? reg.nomEmpleado ?? reg.nomempleado ?? '';
    const apellido =
      reg.APPEMPLEADO ?? reg.appEmpleado ?? reg.appempleado ?? '';

    return `${nombre} ${apellido}`.trim();
  };

  const obtenerEnlace = (reg: RegistroVale) =>
    reg.IDENLACE ?? reg.idEnlace ?? reg.idenlace ?? '';

  const obtenerOrigen = (reg: RegistroVale) => {
    const origen = String(reg.ORIGEN ?? reg.origen ?? '').trim().toUpperCase();
    if (origen === 'SC') return 'SECTOR CENTRAL';
    if (origen === 'GN') return 'PERSONAL DE CARRERA';
    return origen || '-';
  };

  const obtenerCuenta = (reg: RegistroVale) =>
    reg.CUENTAINICIAL ?? reg.cuentaInicial ?? reg.cuentainicial ?? '';

  const obtenerPension = (reg: RegistroVale) =>
    reg.PENSION ?? reg.pension ?? '';

  const fetchRegistros = async () => {
    setLoading(true);
    const token = localStorage.getItem('auth_token');

    try {
      const response = await fetch(
        `${apiUrl('gestor/vales/registrados')}?estatus=${encodeURIComponent(
          filtroEstatus
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `Error HTTP ${response.status} al consultar los vales.`
        );
      }

      const listaRegistros =
        data.data || data.registros || (Array.isArray(data) ? data : []);

      setRegistros(listaRegistros);
      setSeleccionadosIds(new Set());
      setPagina(1);
    } catch (error) {
      console.error('Error al obtener registros de vales:', error);
      setRegistros([]);
      setSeleccionadosIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, [filtroEstatus]);

  const actualizarFiltro = (campo: CampoFiltro, valor: string) => {
    setFiltros((actuales) => ({
      ...actuales,
      [campo]: valor,
    }));
    setPagina(1);
  };

  const cambiarSeleccion = (id: number | string | undefined) => {
    if (id === undefined || id === null) return;

    const clave = String(id);

    setSeleccionadosIds((actuales) => {
      const nuevos = new Set(actuales);

      if (nuevos.has(clave)) {
        nuevos.delete(clave);
      } else {
        nuevos.add(clave);
      }

      return nuevos;
    });
  };

  const descargarFormatosSeleccionados = async () => {
    if (seleccionadosIds.size === 0) {
      alert('Selecciona al menos un registro para descargar sus formatos.');
      return;
    }

    const token = localStorage.getItem('auth_token');
    setDescargandoFormatos(true);

    try {
      for (const id of seleccionadosIds) {
        const response = await fetch(
          `${API_ENDPOINTS.MAIN}/gestor/vales/descargar-formatos/${encodeURIComponent(
            id
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/pdf',
            },
          }
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            message: `No se pudieron generar los formatos del registro ${id}.`,
          }));

          throw new Error(
            error.message || `Error al descargar el registro ${id}.`
          );
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const enlace = document.createElement('a');

        enlace.href = url;
        enlace.download = `formatos_vales_${id}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);

        // Pausa breve para que el navegador inicie cada descarga.
        await new Promise((resolve) => window.setTimeout(resolve, 300));
      }

      setSeleccionadosIds(new Set());
    } catch (error) {
      console.error('Error al descargar formatos seleccionados:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Error al descargar los formatos.'
      );
    } finally {
      setDescargandoFormatos(false);
    }
  };

  const handleCambiarEstatus = async (
    idRegister: number | string,
    nuevoEstatus: number
  ) => {
    const token = localStorage.getItem('auth_token');

    try {
      const response = await fetch(
        `${API_ENDPOINTS.MAIN}/gestor/vales/actualizar-estatus`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({
            idRegister,
            idStatus: nuevoEstatus,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.status) {
        setRegistros((prev) =>
          prev.map((reg) =>
            String(obtenerId(reg)) === String(idRegister)
              ? { ...reg, idStatus: nuevoEstatus }
              : reg
          )
        );
      } else {
        alert(data.message || 'Error al actualizar el estatus.');
      }
    } catch (error) {
      console.error('Error en actualización de estatus:', error);
      alert('Error de conexión.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleEnviarArchivo = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona un archivo primero.');
      return;
    }

    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('archivo', selectedFile);

    setLoading(true);

    try {
      const response = await fetch(
        `${API_ENDPOINTS.MAIN}/gestor/vales/cargar-tarjetas`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok && data.status) {
        await Swal.fire({
          icon: 'success',
          title: 'Carga exitosa',
          text: data.message || 'Tarjetas cargadas y asociadas correctamente.',
          confirmButtonColor: '#800020',
        });
        setSelectedFile(null);
        setFileName('');
        await fetchRegistros();
      } else {
        alert(data.message || 'Error al procesar el archivo.');
      }
    } catch (error) {
      console.error('Error al subir el archivo:', error);
      alert('Error de conexión al subir el archivo.');
    } finally {
      setLoading(false);
    }
  };

  const abrirFormato = async (idRegister: number | string | undefined) => {
    if (idRegister === undefined || idRegister === null) {
      alert('Error: El ID del registro no está definido.');
      return;
    }

    const token = localStorage.getItem('auth_token');

    try {
      const response = await fetch(
        `${API_ENDPOINTS.MAIN}/gestor/vales/descargar-formatos/${encodeURIComponent(
          String(idRegister)
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/pdf',
          },
        }
      );

      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ message: 'Error desconocido' }));

        alert(
          `Error al generar PDF: ${errData.message || response.statusText}`
        );
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error('Error al descargar formatos:', error);
      alert('Error de conexión al descargar formatos.');
    }
  };

  const registrosFiltrados = registros.filter((reg) => {
    const nombre = obtenerNombreCompleto(reg);
    const estatus = obtenerNombreEstatus(obtenerEstatus(reg)).toLowerCase();

    return (
      String(obtenerNumeroEmpleado(reg))
        .toLowerCase()
        .includes(filtros.numero.toLowerCase()) &&
      String(nombre)
        .toLowerCase()
        .includes(filtros.nombre.toLowerCase()) &&
      String(obtenerCuenta(reg) || 'sin asignación')
        .toLowerCase()
        .includes(filtros.cuenta.toLowerCase()) &&
      estatus.includes(filtros.estatus.toLowerCase())
    );
  });

  const totalPaginas = Math.max(
    1,
    Math.ceil(registrosFiltrados.length / porPagina)
  );
  const inicio = (pagina - 1) * porPagina;
  const registrosPagina = registrosFiltrados.slice(inicio, inicio + porPagina);

  const inputFiltroStyle: React.CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    minWidth: '90px',
    padding: '6px 8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '12px',
  };
  if (registroTarjetas) {
    const idRegistroSeleccionado = obtenerId(registroTarjetas);

    if (idRegistroSeleccionado === undefined || idRegistroSeleccionado === null) {
      return (
        <div className="gestor-card">
          El registro seleccionado no tiene un ID válido.
        </div>
      );
    }

    return (
      <TarjetasView
        idRegister={idRegistroSeleccionado}
        onVolver={() => setRegistroTarjetas(null)}
      />
    );
  }
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
          <h2 className="gestor-title">Control y Entrega de Tarjetas</h2>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label
              htmlFor="upload-tarjetas-input"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                backgroundColor: '#0284c7',
                borderColor: '#0284c7',
                margin: 0,
              }}
            >
              📁 Cargar Tarjetas (.csv)
            </label>

            <input
              id="upload-tarjetas-input"
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {selectedFile && (
              <button
                type="button"
                onClick={handleEnviarArchivo}
                className="btn-primary"
                style={{
                  backgroundColor: '#16a34a',
                  borderColor: '#16a34a',
                }}
              >
                ✅ Agregar tarjetas
              </button>
            )}
          </div>

          {fileName && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Archivo seleccionado: <strong>{fileName}</strong>
            </span>
          )}
        </div>
      </div>

      <div
        className="gestor-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <span className="gestor-section-title">Filtrar por Estatus:</span>
          <select
            value={filtroEstatus}
            onChange={(e) => setFiltroEstatus(e.target.value)}
            className="gestor-text-input"
            style={{ maxWidth: '250px', marginTop: '5px' }}
          >
            <option value="todos">Todos los registros</option>
            <option value="1">Pendientes</option>
            <option value="2">Entregadas</option>
            <option value="3">Sustituidas</option>
            <option value="4">Canceladas</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchRegistros}
            className="btn-primary"
            style={{ marginTop: '20px' }}
          >
            🔄 Actualizar Lista
          </button>

          <button
            type="button"
            onClick={descargarFormatosSeleccionados}
            className="btn-primary"
            disabled={descargandoFormatos || seleccionadosIds.size === 0}
            style={{
              marginTop: '20px',
              backgroundColor: '#0284c7',
              opacity: seleccionadosIds.size === 0 ? 0.6 : 1,
              cursor:
                seleccionadosIds.size === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {descargandoFormatos
              ? 'Descargando formatos...'
              : `📄 Descargar formatos seleccionados (${seleccionadosIds.size})`}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="gestor-loading">Cargando listado de vales...</div>
      ) : (
        <div className="gestor-table-card">
          <div className="gestor-table-wrapper">
            <table className="gestor-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>Seleccionar</th>
                  <th>Núm. Emp</th>
                  <th>Nombre Completo</th>
                  <th>Enlace</th>
                  {idType === 1 && <th>Origen del registro</th>}
                  <th>Cuenta Asignada</th>
                  <th>Pensiones</th>
                  <th style={{ textAlign: 'center' }}>Estatus Actual</th>
                  <th style={{ textAlign: 'center' }}>Descargar formatos</th>
                  <th style={{ textAlign: 'center' }}>Asignar Estatus</th>
                  <th style={{ textAlign: 'center' }}>Tarjetas</th>
                </tr>

                <tr>
                  <th></th>
                  <th>
                    <input
                      style={inputFiltroStyle}
                      aria-label="Filtrar por número de empleado"
                      placeholder="Buscar..."
                      value={filtros.numero}
                      onChange={(e) => actualizarFiltro('numero', e.target.value)}
                    />
                  </th>
                  <th>
                    <input
                      style={inputFiltroStyle}
                      aria-label="Filtrar por nombre"
                      placeholder="Buscar..."
                      value={filtros.nombre}
                      onChange={(e) => actualizarFiltro('nombre', e.target.value)}
                    />
                  </th>
                  <th></th>
                  {idType === 1 && <th></th>}
                  <th>
                    <input
                      style={inputFiltroStyle}
                      aria-label="Filtrar por cuenta asignada"
                      placeholder="Buscar..."
                      value={filtros.cuenta}
                      onChange={(e) => actualizarFiltro('cuenta', e.target.value)}
                    />
                  </th>
                  <th></th>
                  <th>
                    <select
                      style={inputFiltroStyle}
                      aria-label="Filtrar por estatus actual"
                      value={filtros.estatus}
                      onChange={(e) => actualizarFiltro('estatus', e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="entregada">Entregada</option>
                      <option value="sustituida">Sustituida</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {registrosPagina.map((reg, index) => {
                  const idRegister = obtenerId(reg);
                  const estatusActual = obtenerEstatus(reg);
                  const nombreEstatus = obtenerNombreEstatus(estatusActual);
                  const nombreCompleto = obtenerNombreCompleto(reg) || '-';
                  const numEmp = obtenerNumeroEmpleado(reg) || '-';
                  const enlace = obtenerEnlace(reg);
                  const cuenta = obtenerCuenta(reg);
                  const pension = obtenerPension(reg);

                  const colorEstatus =
                    estatusActual === 2
                      ? { backgroundColor: '#d4edda', color: '#155724' }
                      : estatusActual === 3
                        ? { backgroundColor: '#dbeafe', color: '#1e40af' }
                        : estatusActual === 4
                          ? { backgroundColor: '#f8d7da', color: '#721c24' }
                          : { backgroundColor: '#fff3cd', color: '#856404' };

                  return (
                    <tr
                      key={idRegister ?? `${numEmp}-${inicio + index}`}
                      className={index % 2 === 0 ? 'gestor-tr-even' : 'gestor-tr-odd'}
                    >
                      <td className="gestor-td-center">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar formatos de ${nombreCompleto}`}
                          checked={
                            idRegister !== undefined &&
                            seleccionadosIds.has(String(idRegister))
                          }
                          onChange={() => cambiarSeleccion(idRegister)}
                        />
                      </td>

                      <td className="gestor-td gestor-num-emp">{numEmp}</td>
                      <td className="gestor-td">{nombreCompleto}</td>
                      <td className="gestor-td">{enlace || '-'}</td>
                      {idType === 1 && (
                        <td className="gestor-td">{obtenerOrigen(reg) || '-'}</td>
                      )}
                      <td className="gestor-td gestor-mono">{cuenta || '-'}</td>
                      <td className="gestor-td">{pension || 'N/A'}</td>

                      <td className="gestor-td-center">
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            ...colorEstatus,
                          }}
                        >
                          {nombreEstatus}
                        </span>
                      </td>

                      <td className="gestor-td-center">
                        {cuenta ? (
                          <button
                            type="button"
                            onClick={() => abrirFormato(idRegister)}
                            style={{
                              padding: '5px 10px',
                              fontSize: '11px',
                              backgroundColor: '#0284c7',
                              color: '#fff',
                              border: '1px solid #0284c7',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            📄 Descargar
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="gestor-td-center">
                        <select
                          aria-label={`Cambiar estatus de ${nombreCompleto}`}
                          value={Number.isNaN(estatusActual) ? '' : String(estatusActual)}
                          onChange={(e) => {
                            if (idRegister !== undefined && idRegister !== null) {
                              void handleCambiarEstatus(idRegister, Number(e.target.value));
                            }
                          }}
                          disabled={idRegister === undefined || idRegister === null}
                        >
                          <option value="" disabled>
                            Selecciona estatus
                          </option>
                          <option value="1">Pendiente</option>
                          <option value="2">Entregada</option>
                          <option value="3">Sustituida</option>
                          <option value="4">Cancelada</option>
                        </select>
                      </td>

                      <td className="gestor-td-center">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => setRegistroTarjetas(reg)}
                          disabled={idRegister === undefined || idRegister === null}
                        >
                          💳 Manejar tarjetas
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {registrosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={idType === 1 ? 11 : 10} className="gestor-empty-row">
                      No se encontraron registros con los filtros seleccionados.
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
              gap: '12px',
              flexWrap: 'wrap',
              padding: '12px',
            }}
          >
            <span>
              {registrosFiltrados.length === 0
                ? 'Sin resultados'
                : `Mostrando ${inicio + 1}–${Math.min(
                  inicio + porPagina,
                  registrosFiltrados.length
                )} de ${registrosFiltrados.length}`}
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

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                disabled={pagina === 1}
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