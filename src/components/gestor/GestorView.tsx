import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../../config/api';

interface Empleado {
  id: number | string;
  nombre: string;
  rfc: string;
  curp: string;
  nivel: string;
  origen: 'Sector Central' | 'GN';
}

export function GestorView() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);

  const fetchEmpleados = async () => {
    setLoading(true);
    const token = localStorage.getItem('auth_token');
    try {
      const response = await fetch(`${API_ENDPOINTS.MAIN}/gestor/empleados?search=${search}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      if (data.status) {
        setEmpleados(data.data);
      }
    } catch (error) {
      console.error('Error al obtener empleados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpleados();
  }, [search]);

  // Manejar selección individual de checkbox
  const handleSelect = (id: number | string, origen: string) => {
    const key = `${origen}_${id}`;
    setSelectedIds(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Exportar seleccionados
  const handleExport = async () => {
    const token = localStorage.getItem('auth_token');
    
    // Separar IDs por origen para el backend
    const idsCentral: any[] = [];
    const idsGn: any[] = [];

    Object.keys(selectedIds).forEach(key => {
      if (selectedIds[key]) {
        const [origen, id] = key.split('_');
        if (origen === 'Sector Central') idsCentral.push(id);
        if (origen === 'GN') idsGn.push(id);
      }
    });

    if (idsCentral.length === 0 && idsGn.length === 0) {
      alert('Por favor selecciona al menos un empleado para exportar.');
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.MAIN}/gestor/exportar-excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids_central: idsCentral, ids_gn: idsGn })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `empleados_seleccionados_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('Error al generar el archivo de exportación.');
      }
    } catch (error) {
      console.error('Error en exportación:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Gestión y Selección de Empleados</h2>
      <p>Consulta información consolidada de Sector Central (Oracle) y GN.</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0' }}>
        <input 
          type="text" 
          placeholder="Buscar por nombre o RFC..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px', width: '300px' }}
        />
        <button 
          onClick={handleExport}
          style={{ backgroundColor: '#28a745', color: 'white', padding: '10px 15px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
        >
          📥 Exportar Seleccionados a Excel
        </button>
      </div>

      {loading ? (
        <p>Cargando registros...</p>
      ) : (
        <table border={1} cellPadding={10} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f2f2f2' }}>
              <th>Seleccionar</th>
              <th>Origen</th>
              <th>Nombre</th>
              <th>RFC</th>
              <th>CURP</th>
              <th>Nivel</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((emp) => {
              const key = `${emp.origen}_${emp.id}`;
              return (
                <tr key={key}>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedIds[key]} 
                      onChange={() => handleSelect(emp.id, emp.origen)}
                    />
                  </td>
                  <td><b>{emp.origen}</b></td>
                  <td>{emp.nombre}</td>
                  <td>{emp.rfc}</td>
                  <td>{emp.curp}</td>
                  <td>{emp.nivel}</td>
                </tr>
              );
            })}
            {empleados.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>No se encontraron registros.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}