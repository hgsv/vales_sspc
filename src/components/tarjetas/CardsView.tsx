import React, { useEffect, useState } from 'react';
import './Cards.css';
import { API_ENDPOINTS, apiUrl } from '../../config/api';

interface TarjetaRow {
  cuenta: string;
  folioCard: string;
}

interface TarjetaDetalle {
  idCard: number | string;
  cuenta: string;
  folioCard: string;
  status?: string;
  NUMEMPLEADO?: string;
  NOMBRECOMPLETO?: string;
  CREATED_AT?: string;
  observaciones?: string;
}

export function CardsView() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingConsulta, setLoadingConsulta] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [previewData, setPreviewData] = useState<TarjetaRow[]>([]);

  // Estados para la consulta por años
  const [aniosDisponibles, setAniolsDisponibles] = useState<number[]>([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>(String(new Date().getFullYear()));
  const [tarjetasConsultadas, setTarjetasConsultadas] = useState<TarjetaDetalle[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMensaje(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMensaje({ tipo: 'error', texto: 'Por favor seleccione un archivo Excel.' });
      return;
    }

    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('file', file); 

    setLoading(true);
    setMensaje(null);

    try {
      const response = await fetch(`${API_ENDPOINTS.MAIN}/tarjetas/upload`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar las tarjetas.');
      }

      setMensaje({ tipo: 'success', texto: data.message || '¡Tarjetas cargadas y registradas exitosamente!' });
      if (data.tarjetas) {
        setPreviewData(data.tarjetas);
      }
      // Actualizar la consulta del año actual
      fetchTarjetasPorAnio(anioSeleccionado);
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message || 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTarjetasPorAnio = async (anio: string) => {
    setLoadingConsulta(true);
    const token = localStorage.getItem('auth_token');

    try {
      const response = await fetch(`${apiUrl('gestor/tarjetas/por-anio')}?anio=${encodeURIComponent(anio)}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.status) {
        setTarjetasConsultadas(data.data || []);
      } else {
        setTarjetasConsultadas([]);
      }
    } catch (error) {
      console.error('Error al consultar tarjetas por año:', error);
      setTarjetasConsultadas([]);
    } finally {
      setLoadingConsulta(false);
    }
  };

  useEffect(() => {
    // Generar una lista de años recientes (por ejemplo, desde 2024 hasta el año actual)
    const anioActual = new Date().getFullYear();
    const lista = [];
    for (let y = anioActual; y >= 2024; y--) {
      lista.push(y);
    }
    setAniolsDisponibles(lista);
    fetchTarjetasPorAnio(anioSeleccionado);
  }, []);

  const handleCambioAnio = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoAnio = e.target.value;
    setAnioSeleccionado(nuevoAnio);
    fetchTarjetasPorAnio(nuevoAnio);
  };

  return (
    <div className="cards-container">
      <div className="cards-header">
        <h2 className="cards-title">Gestión y Consulta de Tarjetas</h2>
      </div>

      {mensaje && (
        <div className={`cards-alert ${mensaje.tipo === 'success' ? 'cards-alert-success' : 'cards-alert-error'}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Sección de Carga */}
      <div className="cards-card">
        <form onSubmit={handleSubmit} className="cards-upload-zone">
          <div>
            <span className="cards-section-title">Seleccionar Archivo Excel (.xlsx, .xls)</span>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileChange} 
              className="cards-file-input"
            />
          </div>

          <div className="cards-actions">
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading || !file}
            >
              {loading ? 'Procesando...' : 'Cargar y Registrar Tarjetas'}
            </button>
          </div>
        </form>
      </div>

      {/* Sección de Consulta por Años */}
      <div className="cards-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <h3 className="cards-section-title" style={{ margin: 0 }}>Consultar Tarjetas Registradas por Año</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="select-anio" style={{ fontWeight: 500, fontSize: '14px' }}>Año:</label>
            <select
              id="select-anio"
              value={anioSeleccionado}
              onChange={handleCambioAnio}
              className="cards-file-input"
              style={{ padding: '6px 12px', maxWidth: '150px' }}
            >
              {aniosDisponibles.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Resultados de la Consulta */}
      <div className="cards-table-card">
        <div className="cards-table-header">
          <h3>Tarjetas del Año {anioSeleccionado} ({tarjetasConsultadas.length})</h3>
        </div>
        <div className="cards-table-wrapper">
          {loadingConsulta ? (
            <p style={{ padding: '20px', textAlign: 'center' }}>Cargando registros...</p>
          ) : (
            <table className="cards-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cuenta</th>
                  <th>Folio</th>
                  <th>Núm. Empleado</th>
                  <th>Nombre Completo</th>
                  <th>Estatus</th>
                  <th>Fecha Registro</th>
                </tr>
              </thead>
              <tbody>
                {tarjetasConsultadas.map((item, index) => (
                  <tr key={item.idCard || index} className={index % 2 === 0 ? 'cards-tr-even' : 'cards-tr-odd'}>
                    <td className="cards-td">{index + 1}</td>
                    <td className="cards-td cards-mono">{item.cuenta}</td>
                    <td className="cards-td cards-mono">{item.folioCard || 'N/A'}</td>
                    <td className="cards-td">{item.NUMEMPLEADO || '—'}</td>
                    <td className="cards-td">{item.NOMBRECOMPLETO || '—'}</td>
                    <td className="cards-td">
                      <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', background: '#e2e8f0' }}>
                        {item.status || 'Registrada'}
                      </span>
                    </td>
                    <td className="cards-td" style={{ fontSize: '12px' }}>
                      {item.CREATED_AT ? new Date(item.CREATED_AT).toLocaleDateString('es-MX') : '—'}
                    </td>
                  </tr>
                ))}
                {tarjetasConsultadas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="cards-td" style={{ textAlign: 'center', padding: '20px' }}>
                      No se encontraron tarjetas registradas para el año {anioSeleccionado}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}