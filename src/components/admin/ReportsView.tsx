import React, { useCallback, useEffect, useState } from 'react';
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

const obtenerValor = (fila: FilaReporte, key: string) =>
  fila[key] ?? fila[key.toLowerCase()] ?? fila[key.toUpperCase()] ?? '';

export function ReportsView() {
  const [anios, setAnios] = useState<number[]>([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState('');
  const [columnas, setColumnas] = useState<ColumnaReporte[]>([]);
  const [registros, setRegistros] = useState<FilaReporte[]>([]);
  const [origen, setOrigen] = useState('');
  const [cargandoAnios, setCargandoAnios] = useState(true);
  const [cargandoReporte, setCargandoReporte] = useState(false);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('auth_token');

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el reporte.');
      setColumnas([]);
      setRegistros([]);
    } finally {
      setCargandoReporte(false);
    }
  }, [anioSeleccionado]);

  useEffect(() => {
    void cargarReporte();
  }, [cargarReporte]);

  const exportarExcel = () => {
    if (registros.length === 0 || columnas.length === 0) return;

    const filasExcel = [
      columnas.map((columna) => columna.label),
      ...registros.map((registro) =>
        columnas.map((columna) => obtenerValor(registro, columna.key))
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
              onChange={(event) => setAnioSeleccionado(event.target.value)}
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

          <button
            type="button"
            className="btn-success"
            onClick={exportarExcel}
            disabled={cargandoReporte || registros.length === 0}
            style={{ marginTop: 0 }}
          >
            Exportar Excel ({registros.length})
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
                {registros.map((registro, index) => (
                  <tr
                    key={String(obtenerValor(registro, 'IDREGISTER') || index)}
                    className={index % 2 === 0 ? 'gestor-tr-even' : 'gestor-tr-odd'}
                  >
                    {columnas.map((columna) => (
                      <td className="gestor-td" key={columna.key}>
                        {String(obtenerValor(registro, columna.key) ?? '—') || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
                {registros.length === 0 && (
                  <tr>
                    <td colSpan={Math.max(columnas.length, 1)} className="gestor-empty-row">
                      No hay registros de {origenLabel} para el año seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: 12 }}>
            {registros.length} registros encontrados para {anioSeleccionado || '—'}.
          </div>
        </div>
      )}
    </div>
  );
}
