import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS, apiUrl } from '../../config/api';
import "../gestor/GestorView.css";

interface RegistroVale {
  idRegister: number | string;
  numEmpleado?: string;
  numempleado?: string;
  nomEmpleado?: string;
  nomempleado?: string;
  appEmpleado?: string;
  appempleado?: string;
  rfc: string;
  curp: string;
  cuentaInicial?: string;
  cuentainicial?: string;
  idStatus: number;
}

export function EstatusValesView() {
  const [registros, setRegistros] = useState<RegistroVale[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Estado para guardar el archivo temporalmente

  const fetchRegistros = async () => {
    setLoading(true);
    const token = localStorage.getItem('auth_token');
    try {
      const response = await fetch(`${apiUrl('gestor/vales/registrados')}?estatus=${encodeURIComponent(filtroEstatus)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Error HTTP ${response.status} al consultar los vales.`);
      }
      const listaRegistros = data.data || data.registros || (Array.isArray(data) ? data : []);
      setRegistros(listaRegistros);
    } catch (error) {
      console.error('Error al obtener registros de vales:', error);
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, [filtroEstatus]);

  const handleCambiarEstatus = async (idRegister: number | string, nuevoEstatus: number) => {
    const token = localStorage.getItem('auth_token');
    try {
      const response = await fetch(`${API_ENDPOINTS.MAIN}/gestor/vales/actualizar-estatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ idRegister, idStatus: nuevoEstatus })
      });

      const data = await response.json();
      if (response.ok && data.status) {
        setRegistros(prev => prev.map(reg =>
          reg.idRegister === idRegister ? { ...reg, idStatus: nuevoEstatus } : reg
        ));
      } else {
        alert(data.message || 'Error al actualizar el estatus.');
      }
    } catch (error) {
      console.error('Error en actualización de estatus:', error);
      alert('Error de conexión.');
    }
  };

  // Solo almacena el archivo seleccionado localmente
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  // Función que se ejecuta al presionar el botón "Agregar tarjetas"
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
      const response = await fetch(`${API_ENDPOINTS.MAIN}/gestor/vales/cargar-tarjetas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.status) {
        alert(data.message || 'Tarjetas cargadas y asociadas correctamente.');
        setSelectedFile(null);
        setFileName('');
        fetchRegistros(); // Recarga la tabla para reflejar las cuentas asignadas
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


  return (
    <div className="gestor-container">
      <div className="gestor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 className="gestor-title">Control y Entrega de Vales de Despensa</h2>
          <p className="gestor-subtitle">Gestión de estatus (Pendiente / Entregada) para el personal registrado.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
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
                margin: 0
              }}
            >
              📁 Seleccionar Archivo
            </label>
            <input
              id="upload-tarjetas-input"
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Botón para procesar las tarjetas después de cargarlas */}
            {selectedFile && (
              <button
                type="button"
                onClick={handleEnviarArchivo}
                className="btn-primary"
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
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

      <div className="gestor-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          </select>
        </div>
        <button onClick={fetchRegistros} className="btn-primary" style={{ marginTop: '20px' }}>
          🔄 Actualizar Lista
        </button>
      </div>

      {loading ? (
        <div className="gestor-loading">Cargando listado de vales...</div>
      ) : (
        <div className="gestor-table-card">
          <div className="gestor-table-wrapper">
            <table className="gestor-table">
              <thead>
                <tr>
                  <th>Núm. Emp</th>
                  <th>Nombre Completo</th>
                  <th>RFC</th>
                  <th>CURP</th>
                  <th>Cuenta Asignada</th>
                  <th style={{ textAlign: 'center' }}>Estatus Actual</th>
                  <th style={{ textAlign: 'center' }}>Acciones / Asignar Estatus</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((reg, index) => {
                  const rowClass = index % 2 === 0 ? 'gestor-tr-even' : 'gestor-tr-odd';
                  const esEntregada = Number(reg.idStatus) === 2;

                  const numEmp = reg.numEmpleado || reg.numempleado || '-';
                  const nomEmp = reg.nomEmpleado || reg.nomempleado || '';
                  const appEmp = reg.appEmpleado || reg.appempleado || '';
                  const cuenta = reg.cuentaInicial || reg.cuentainicial || 'Sin asignación';

                  return (
                    <tr key={reg.idRegister || index} className={rowClass}>
                      <td className="gestor-td gestor-num-emp">{numEmp}</td>
                      <td className="gestor-td">{[nomEmp, appEmp].filter(Boolean).join(' ')}</td>
                      <td className="gestor-td gestor-mono">{reg.rfc}</td>
                      <td className="gestor-td gestor-mono">{reg.curp}</td>
                      <td className="gestor-td gestor-mono">{cuenta}</td>
                      <td className="gestor-td-center">
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: esEntregada ? '#d4edda' : '#fff3cd',
                          color: esEntregada ? '#155724' : '#856404'
                        }}>
                          {esEntregada ? 'Entregada' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="gestor-td-center" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={async () => {
                            // Validar que el ID exista antes de hacer el fetch
                            const idReg = reg.idRegister || (reg as any).idregister;
                            if (!idReg) {
                              alert('Error: El ID del registro no está definido.');
                              return;
                            }

                            const token = localStorage.getItem('auth_token');
                            try {
                              const response = await fetch(`${API_ENDPOINTS.MAIN}/gestor/vales/descargar-formatos/${idReg}`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              if (response.ok) {
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                window.open(url, '_blank');
                              } else {
                                const errData = await response.json().catch(() => ({ message: 'Error desconocido' }));
                                console.error('Error del backend:', errData);
                                alert(`Error al generar PDF: ${errData.message || response.statusText}`);
                              }
                            } catch (err) {
                              console.error(err);
                              alert('Error de conexión al descargar formatos.');
                            }
                          }}
                          style={{
                            padding: '5px 10px',
                            fontSize: '11px',
                            backgroundColor: '#0284c7',
                            color: '#fff',
                            border: '1px solid #0284c7',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          📄 Descarga de formatos
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCambiarEstatus(reg.idRegister, 1)}
                          style={{
                            padding: '5px 10px',
                            fontSize: '11px',
                            backgroundColor: !esEntregada ? '#6c757d' : '#f8f9fa',
                            color: !esEntregada ? '#fff' : '#333',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Marcar Pendiente
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCambiarEstatus(reg.idRegister, 2)}
                          style={{
                            padding: '5px 10px',
                            fontSize: '11px',
                            backgroundColor: esEntregada ? '#28a745' : '#e2e6ea',
                            color: esEntregada ? '#fff' : '#333',
                            border: '1px solid #28a745',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Marcar Entregada
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {registros.length === 0 && (
                  <tr>
                    <td colSpan={7} className="gestor-empty-row">
                      No se encontraron registros de vales con el filtro seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}