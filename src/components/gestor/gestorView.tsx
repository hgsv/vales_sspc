import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from '../../config/api';
import './GestorView.css';
import TexturaRoja from '../../images/textura-roja.png';
import TexturaClara from '../../images/textura-roja2.png';

interface Empleado {
  num_empleado: string;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  rfc: string;
  curp: string;
  nivel?: string;
  cargo?: string;
  domicilio?: string;
  clave_ur?: string;
  modalidad?: string;
  ss?: string;
  origen: 'Sector Central' | 'GN';
}

export function GestorView() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [numEmpleadoInput, setNumEmpleadoInput] = useState('');
  const [origenSeleccionado, setOrigenSeleccionado] = useState<'SC' | 'GN' | 'ambos'>('ambos');

  const [seleccionadosMap, setSeleccionadosMap] = useState<{ [key: string]: Empleado }>({});
  const [empleadosGuardadosMap, setEmpleadosGuardadosMap] = useState<{ [key: string]: Empleado }>({});
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numEmpleadoInput.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Por favor, ingresa un número de empleado para realizar la búsqueda.',
        confirmButtonColor: '#800020'
      });
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('auth_token');

    try {
      const response = await fetch(
        `${API_ENDPOINTS.MAIN}/gestor/empleados?num_empleado=${numEmpleadoInput.trim()}&origen=${origenSeleccionado}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );
      const data = await response.json();
      if (data.status) {
        setEmpleados(data.data);
        if (data.data.length === 0) {
          Swal.fire({
            icon: 'info',
            title: 'Sin resultados',
            text: 'No se encontró ningún registro con ese número de empleado en el origen seleccionado.',
            confirmButtonColor: '#800020'
          });
        }
      }
    } catch (error) {
      console.error('Error al obtener empleado:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al consultar el servidor.',
        confirmButtonColor: '#800020'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (emp: Empleado) => {
    const key = `${emp.origen}_${emp.num_empleado}`;
    setSeleccionadosMap(prev => {
      const nuevo = { ...prev };
      if (nuevo[key]) {
        delete nuevo[key];
      } else {
        nuevo[key] = emp;
      }
      return nuevo;
    });
  };

  const handleRemoveSeleccionado = (key: string) => {
    setSeleccionadosMap(prev => {
      const nuevo = { ...prev };
      delete nuevo[key];
      return nuevo;
    });
  };

  const exportarEmpleados = (empleadosParaExportar: Empleado[]) => {
    if (empleadosParaExportar.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Aviso',
        text: 'No hay empleados para exportar.',
        confirmButtonColor: '#800020'
      });
      return;
    }

    const headers = [
      "Num. Empleado",
      "Origen",
      "Nombre",
      "Apellido Paterno",
      "Apellido Materno",
      "RFC",
      "CURP",
      "Unidad / Nivel",
      "Detalle (SS / Cargo / Modalidad)"
    ];

    const rows = empleadosParaExportar.map(emp => {
      const detalle = emp.origen === 'Sector Central'
        ? `SS: ${emp.ss || 'N/A'}`
        : `Cargo: ${emp.cargo || 'N/A'} | Mod: ${emp.modalidad || 'N/A'}`;

      const unidadNivel = emp.origen === 'Sector Central'
        ? `Unidad: ${emp.nivel || 'N/A'}`
        : `UR: ${emp.clave_ur || 'N/A'} | Nivel: ${emp.nivel || 'N/A'}`;

      return [
        `"${emp.num_empleado || ''}"`,
        `"${emp.origen || ''}"`,
        `"${emp.nombre || ''}"`,
        `"${emp.apellido_paterno || ''}"`,
        `"${emp.apellido_materno || ''}"`,
        `"${emp.rfc || ''}"`,
        `"${emp.curp || ''}"`,
        `"${unidadNivel}"`,
        `"${detalle}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `empleados_seleccionados_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    exportarEmpleados(Object.values(seleccionadosMap));
  };

  const handleExportGuardados = () => {
    exportarEmpleados(Object.values(empleadosGuardadosMap));
  };

  const handleTerminarCaptura = async () => {
    const empleadosSeleccionados = Object.values(seleccionadosMap);

    if (empleadosSeleccionados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin selección',
        text: 'Por favor, selecciona al menos un empleado para registrar.',
        confirmButtonColor: '#800020'
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Estás seguro de registrar a los ${empleadosSeleccionados.length} empleados seleccionados en el sistema?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#800020',
      cancelButtonColor: '#6c757d'
    });

    if (!result.isConfirmed) return;

    const token = localStorage.getItem('auth_token');

    try {
      const response = await fetch(`${API_ENDPOINTS.MAIN}/gestor/guardar-captura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ empleados: empleadosSeleccionados })
      });

      const data = await response.json();

      if (response.ok && data.status) {
        Swal.fire({
          icon: 'success',
          title: '¡Registros guardados!',
          text: '¡Registros guardados exitosamente en la tabla registers!',
          confirmButtonColor: '#800020'
        });
        setEmpleadosGuardadosMap(prev => ({ ...prev, ...seleccionadosMap }));
        setSeleccionadosMap({});
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Atención',
          text: data.message || 'Ocurrió un error al intentar guardar los registros.',
          confirmButtonColor: '#800020'
        });
      }
    } catch (error) {
      console.error('Error al guardar captura:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Error de conexión con el servidor.',
        confirmButtonColor: '#800020'
      });
    }
  };

  const listaSeleccionados = Object.entries(seleccionadosMap);
  const listaGuardados = Object.entries(empleadosGuardadosMap);

  return (
    <div
      className="dashboard-container"
      style={{ '--bg-claro': `url(${TexturaClara})` } as React.CSSProperties}
    >
      <aside
        className="sidebar"
        style={{ '--bg-rojo': `url(${TexturaRoja})` } as React.CSSProperties}
      ></aside>

      <div className="main-content-wrapper">
        <div className="gestor-header">
          <h2 className="gestor-title">Gestión y Selección de Empleados</h2>
          <p className="gestor-subtitle">Módulo de consulta centralizada para Vales de Despensa (Sector Central y Guardia Nacional).</p>
        </div>

        <div className="gestor-card">
          <form onSubmit={handleSearch}>
            <div className="gestor-label-group">
              <span className="gestor-section-title">BASE DE DATOS / ORIGEN DE CONSULTA:</span>
              <div className="gestor-radio-group">
                <label className="gestor-radio-label">
                  <input
                    type="radio"
                    name="origen"
                    value="SC"
                    checked={origenSeleccionado === 'SC'}
                    onChange={() => setOrigenSeleccionado('SC')}
                    className="gestor-radio-input"
                  />
                  Sector Central
                </label>
                <label className="gestor-radio-label">
                  <input
                    type="radio"
                    name="origen"
                    value="GN"
                    checked={origenSeleccionado === 'GN'}
                    onChange={() => setOrigenSeleccionado('GN')}
                    className="gestor-radio-input"
                  />
                  Guardia Nacional
                </label>
              </div>
            </div>

            <div className="gestor-actions">
              <div className="gestor-input-wrapper">
                <div>
                  <label className="gestor-input-label">NÚMERO DE EMPLEADO</label>
                  <input
                    type="text"
                    value={numEmpleadoInput}
                    onChange={(e) => setNumEmpleadoInput(e.target.value)}
                    className="gestor-text-input"
                  />
                </div>
                <button type="submit" className="btn-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-search" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                  </svg> Buscar Registro
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="gestor-card" style={{ borderLeft: '4px solid #800020' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#6b0f1a', fontSize: '16px' }}>
                Lote de Empleados Listos para Exportar ({listaSeleccionados.length})
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                Los empleados seleccionados se acumulan aquí para que puedas seguir buscando más registros.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleExport}
                className="btn-success"
                style={{ marginTop: 0 }}
              >
                Exportar Excel ({listaSeleccionados.length})
              </button>
              <button
                type="button"
                onClick={handleTerminarCaptura}
                className="btn-primary"
                style={{ marginTop: 0, backgroundColor: '#6b0f1a' }}
              >
                Terminar Captura ({listaSeleccionados.length})
              </button>
            </div>
          </div>

          {listaSeleccionados.length > 0 && (
            <div className="gestor-batch-container">
              {listaSeleccionados.map(([key, emp]) => (
                <div key={key} className="gestor-batch-chip">
                  <span><strong>{emp.num_empleado}</strong> - {emp.nombre} ({emp.origen})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSeleccionado(key)}
                    className="gestor-chip-remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel de Registros Ya Guardados */}
        {listaGuardados.length > 0 && (
          <div className="gestor-card" style={{ borderLeft: '4px solid #28a745', backgroundColor: '#f8f9fa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#155724', fontSize: '16px' }}>
                  ✅ Registros Guardados Exitosamente ({listaGuardados.length})
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                  Estos registros ya fueron enviados al sistema, pero puedes descargarlos nuevamente cuando gustes.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleExportGuardados}
                  className="btn-success"
                  style={{ marginTop: 0, backgroundColor: '#28a745' }}
                >
                  📥 Descargar Archivo Guardado ({listaGuardados.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de Resultados */}
        {loading ? (
          <div className="gestor-loading">
            Consultando información en la base de datos institucional...
          </div>
        ) : (
          <div className="gestor-table-card">
            <div className="gestor-table-wrapper">
              <table className="gestor-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: '90px' }}>Seleccionar</th>
                    <th>Núm. Emp</th>
                    <th>Origen</th>
                    <th>Nombre(s)</th>
                    <th>Ap. Paterno</th>
                    <th>Ap. Materno</th>
                    <th>RFC</th>
                    <th>CURP</th>
                    <th>Unidad / Detalle</th>
                    <th>SS / Cargo / Modalidad</th>
                  </tr>
                </thead>
                <tbody>
                  {empleados.map((emp, index) => {
                    const key = `${emp.origen}_${emp.num_empleado}`;
                    const isChecked = !!seleccionadosMap[key];
                    const rowClass = index % 2 === 0 ? 'gestor-tr-even' : 'gestor-tr-odd';

                    return (
                      <tr key={key} className={rowClass}>
                        <td className="gestor-td-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(emp)}
                            className="gestor-checkbox"
                          />
                        </td>
                        <td className="gestor-td gestor-num-emp">{emp.num_empleado}</td>
                        <td className="gestor-td">
                          <span className={emp.origen === 'Sector Central' ? 'badge-sc' : 'badge-gn'}>
                            {emp.origen}
                          </span>
                        </td>
                        <td className="gestor-td gestor-text-muted">{emp.nombre}</td>
                        <td className="gestor-td gestor-text-muted">{emp.apellido_paterno || '—'}</td>
                        <td className="gestor-td gestor-text-muted">{emp.apellido_materno || '—'}</td>
                        <td className="gestor-td gestor-text-muted gestor-mono">{emp.rfc}</td>
                        <td className="gestor-td gestor-text-muted gestor-mono">{emp.curp}</td>
                        <td className="gestor-td gestor-text-muted">
                          {emp.origen === 'Sector Central' ? (
                            <span>Unidad: {emp.nivel || 'N/A'}</span>
                          ) : (
                            <span>UR: {emp.clave_ur || 'N/A'} | Nivel: {emp.nivel || 'N/A'}</span>
                          )}
                        </td>
                        <td className="gestor-td gestor-text-muted">
                          {emp.origen === 'Sector Central' ? (
                            <span>SS: {emp.ss || 'N/A'}</span>
                          ) : (
                            <span>Cargo: {emp.cargo || 'N/A'} <br />Mod: {emp.modalidad || 'N/A'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {empleados.length === 0 && (
                    <tr>
                      <td colSpan={10} className="gestor-empty-row">
                        No hay registros para mostrar. Ingrese un número de empleado y presione el botón de búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}