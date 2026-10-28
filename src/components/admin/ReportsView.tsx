import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { apiUrl } from '../../config/api';
import '../gestor/GestorView.css';

interface ColumnaReporte {
  key: string;
  label: string;
}

type FilaReporte = Record<string, string | number | null | undefined>;

interface RespuestaReporte {
  status: boolean;
  message?: string;
  origen?: string;
  anio?: number;
  columnas?: ColumnaReporte[];
  data?: FilaReporte[];
}

interface FiltrosReporte {
  enlace: string;
  estatus: string;
  origen: string;
  ur: string;
}

const obtenerValor = (fila: FilaReporte, key: string) =>
  fila[key] ?? fila[key.toLowerCase()] ?? fila[key.toUpperCase()] ?? '';

const nombresEstatus: Record<string, string> = {
  '1': 'Pendiente',
  '2': 'Entregada',
  '3': 'Sustituida',
  '4': 'Cancelada',
};

const obtenerValorMostrado = (fila: FilaReporte, key: string) => {
  const valor = obtenerValor(fila, key);
  if (key.toUpperCase() === 'IDSTATUS') {
    return nombresEstatus[String(valor).trim()] ?? String(valor || '—');
  }
  return valor;
};

export function ReportsView() {
  const [anios, setAnios] = useState<number[]>([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState('');
  const [columnas, setColumnas] = useState<ColumnaReporte[]>([]);
  const [registros, setRegistros] = useState<FilaReporte[]>([]);
  const [origen, setOrigen] = useState('');
  const [cargandoAnios, setCargandoAnios] = useState(true);
  const [cargandoReporte, setCargandoReporte] = useState(false);
  const [error, setError] = useState('');

  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    enlace: '',
    estatus: '',
    origen: '',
    ur: '',
  });

  const token = () => localStorage.getItem('auth_token');

  const opcionesFiltro = (key: string) =>
    Array.from(
      new Set(
        registros
          .map((registro) => String(obtenerValor(registro, key)).trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

  const registrosFiltrados = registros.filter((registro) =>
    (!filtros.enlace || String(obtenerValor(registro, 'IDENLACE')).trim() === filtros.enlace) &&
    (!filtros.estatus || String(obtenerValor(registro, 'IDSTATUS')).trim() === filtros.estatus) &&
    (!filtros.origen || String(obtenerValor(registro, 'ORIGEN')).trim().toUpperCase() === filtros.origen) &&
    (!filtros.ur || String(obtenerValor(registro, 'UR')).trim() === filtros.ur)
  );

  const totalPaginas = Math.max(1, Math.ceil(registrosFiltrados.length / porPagina));
  const inicio = (pagina - 1) * porPagina;
  const registrosPagina = registrosFiltrados.slice(inicio, inicio + porPagina);

  useEffect(() => {
    const cargarAnios = async () => {
      setCargandoAnios(true);
      setError('');

      try {
        const response = await fetch(apiUrl('admin/reportes/anios'), {
          headers: {
            Authorization: `Bearer ${token()}`,
            Accept: 'application/json',
          },
        });
        const data = await response.json();

        if (!response.ok || !data.status) {
          throw new Error(data.message || 'No se pudieron consultar los años.');
        }

        const lista = (data.data ?? []).map((anio: number | string) => Number(anio));
        setAnios(lista);
        setOrigen(data.origen ?? '');

        if (lista.length > 0) {
          setAnioSeleccionado(String(lista[0]));
        } else {
          setRegistros([]);
          setColumnas([]);
          setPagina(1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al consultar años.');
      } finally {
        setCargandoAnios(false);
      }
    };

    void cargarAnios();
  }, []);

  const cargarReporte = useCallback(async () => {
    if (!anioSeleccionado) return;

    setCargandoReporte(true);
    setError('');

    try {
      const params = new URLSearchParams({ anio: anioSeleccionado });
      const response = await fetch(
        `${apiUrl('admin/reportes/registros')}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token()}`,
            Accept: 'application/json',
          },
        }
      );
      const data: RespuestaReporte = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(data.message || 'No se pudo cargar el reporte.');
      }

      setOrigen(data.origen ?? '');
      setColumnas(data.columnas ?? []);
      setRegistros(data.data ?? []);
      setFiltros({ enlace: '', estatus: '', origen: '', ur: '' });
      setPagina(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el reporte.');
      setColumnas([]);
      setRegistros([]);
      setPagina(1);
    } finally {
      setCargandoReporte(false);
    }
  }, [anioSeleccionado]);

  useEffect(() => {
    void cargarReporte();
  }, [cargarReporte]);

  const exportarExcel = () => {
    if (registrosFiltrados.length === 0 || columnas.length === 0) return;

    const filasExcel = [
      columnas.map((columna) => columna.label),
      ...registrosFiltrados.map((registro) =>
        columnas.map((columna) => obtenerValorMostrado(registro, columna.key))
      ),
    ];

    const hoja = XLSX.utils.aoa_to_sheet(filasExcel);
    hoja['!cols'] = columnas.map((columna) => ({
      wch: Math.min(Math.max(columna.label.length + 4, 16), 32),
    }));

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Registros');
    XLSX.writeFile(libro, `reporte_${origen || 'registros'}_${anioSeleccionado}.xlsx`);
  };

  const origenLabel = origen === 'SC' ? 'Sector Central (SSPC)' : 'Guardia Nacional';

  return (
    <div className="gestor-container">
      <div className="gestor-header">
        <h2 className="gestor-title">Reportes de registros</h2>
        <p className="gestor-subtitle">
          Consulta los registros por año correspondientes a tu origen: {origenLabel}.
        </p>
      </div>

      <div className="gestor-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ minWidth: 220 }}>
            <label className="gestor-input-label" htmlFor="reporte-anio">
              AÑO DE REGISTRO
            </label>
            <select
              id="reporte-anio"
              className="gestor-text-input"
              value={anioSeleccionado}
              onChange={(event) => {
                setAnioSeleccionado(event.target.value);
                setFiltros({ enlace: '', estatus: '', origen: '', ur: '' });
                setPagina(1);
              }}
              disabled={cargandoAnios || anios.length === 0}
              style={{ marginTop: 6 }}
            >
              {anios.length === 0 && <option value="">Sin años disponibles</option>}
              {anios.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))',
              gap: 12,
              flex: '1 1 700px',
              minWidth: 0,
            }}
          >
            <div>
              <label className="gestor-input-label" htmlFor="reporte-enlace">ENLACE</label>
              <select
                id="reporte-enlace"
                className="gestor-text-input"
                value={filtros.enlace}
                onChange={(event) => {
                  setFiltros((actual) => ({ ...actual, enlace: event.target.value }));
                  setPagina(1);
                }}
                disabled={cargandoReporte}
              >
                <option value="">Todos</option>
                {opcionesFiltro('IDENLACE').map((valor) => <option key={valor} value={valor}>{valor}</option>)}
              </select>
            </div>
            <div>
              <label className="gestor-input-label" htmlFor="reporte-estatus">ESTATUS</label>
              <select
                id="reporte-estatus"
                className="gestor-text-input"
                value={filtros.estatus}
                onChange={(event) => {
                  setFiltros((actual) => ({ ...actual, estatus: event.target.value }));
                  setPagina(1);
                }}
                disabled={cargandoReporte}
              >
                <option value="">Todos</option>
                {opcionesFiltro('IDSTATUS').map((valor) => (
                  <option key={valor} value={valor}>
                    {nombresEstatus[valor] ?? valor}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="gestor-input-label" htmlFor="reporte-origen">ORIGEN</label>
              <select
                id="reporte-origen"
                className="gestor-text-input"
                value={filtros.origen}
                onChange={(event) => {
                  setFiltros((actual) => ({ ...actual, origen: event.target.value }));
                  setPagina(1);
                }}
                disabled={cargandoReporte}
              >
                <option value="">Todos</option>
                {opcionesFiltro('ORIGEN').map((valor) => (
                  <option key={valor} value={valor.toUpperCase()}>
                    {valor.toUpperCase() === 'SC' ? 'Sector Central (SSPC)' : valor.toUpperCase() === 'GN' ? 'Guardia Nacional' : valor}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="gestor-input-label" htmlFor="reporte-ur">UR</label>
              <select
                id="reporte-ur"
                className="gestor-text-input"
                value={filtros.ur}
                onChange={(event) => {
                  setFiltros((actual) => ({ ...actual, ur: event.target.value }));
                  setPagina(1);
                }}
                disabled={cargandoReporte}
              >
                <option value="">Todas</option>
                {opcionesFiltro('UR').map((valor) => <option key={valor} value={valor}>{valor}</option>)}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="btn-success"
            onClick={exportarExcel}
            disabled={cargandoReporte || registrosFiltrados.length === 0}
            style={{ marginTop: 0 }}
          >
            Exportar Excel ({registrosFiltrados.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="gestor-card" role="alert" style={{ color: '#842029' }}>
          {error}
        </div>
      )}

      {cargandoAnios || cargandoReporte ? (
        <div className="gestor-loading">Cargando reporte...</div>
      ) : (
        <div className="gestor-table-card">
          <div className="gestor-table-wrapper">
            <table className="gestor-table">
              <thead>
                <tr>
                  {columnas.map((columna) => (
                    <th key={columna.key}>{columna.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrosPagina.map((registro, index) => (
                  <tr
                    key={String(obtenerValor(registro, 'IDREGISTER') || inicio + index)}
                    className={
                      (inicio + index) % 2 === 0 ? 'gestor-tr-even' : 'gestor-tr-odd'
                    }
                  >
                    {columnas.map((columna) => (
                      <td className="gestor-td" key={columna.key}>
                        {String(obtenerValorMostrado(registro, columna.key) ?? '—') || '—'}
                      </td>
                    ))}
                  </tr>
                ))}

                {registrosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={Math.max(columnas.length, 1)} className="gestor-empty-row">
                      {registros.length === 0
                        ? `No hay registros de ${origenLabel} para el año seleccionado.`
                        : 'No hay registros que coincidan con los filtros seleccionados.'}
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
                onChange={(event) => {
                  setPorPagina(Number(event.target.value));
                  setPagina(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                disabled={pagina === 1 || registrosFiltrados.length === 0}
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
                disabled={pagina >= totalPaginas || registrosFiltrados.length === 0}
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