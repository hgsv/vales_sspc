import React, { useState } from 'react';
import './Cards.css';
import { API_ENDPOINTS } from '../../config/api';

interface TarjetaRow {
  cuenta: string;
  folio: string;
}

export function CardsView() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [previewData, setPreviewData] = useState<TarjetaRow[]>([]);

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
    formData.append('file', file); // Asegúrate de que el nombre coincida con tu backend (ej. 'file', 'excel', etc.)

    setLoading(true);
    setMensaje(null);

    try {
      const response = await fetch(`${API_ENDPOINTS.MAIN}/tarjetas/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Nota: No incluyas 'Content-Type' cuando envíes FormData, el navegador lo configura automáticamente con el boundary
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar las tarjetas.');
      }

      setMensaje({ tipo: 'success', texto: '¡Tarjetas cargadas y registradas exitosamente!' });
      if (data.tarjetas) {
        setPreviewData(data.tarjetas);
      }
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message || 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cards-container">
      <div className="cards-header">
        <h2 className="cards-title">Gestión de Tarjetas</h2>
        <p className="cards-subtitle">Carga masiva mediante archivo Excel (Campos requeridos: CUENTA y FOLIO)</p>
      </div>

      {mensaje && (
        <div className={`cards-alert ${mensaje.tipo === 'success' ? 'cards-alert-success' : 'cards-alert-error'}`}>
          {mensaje.texto}
        </div>
      )}

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

      {previewData.length > 0 && (
        <div className="cards-table-card">
          <div className="cards-table-wrapper">
            <table className="cards-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cuenta</th>
                  <th>Folio</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'cards-tr-even' : 'cards-tr-odd'}>
                    <td className="cards-td">{index + 1}</td>
                    <td className="cards-td cards-mono">{item.cuenta}</td>
                    <td className="cards-td cards-mono">{item.folio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}