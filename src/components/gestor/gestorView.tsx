import React, { useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from '../../config/api';
import './GestorView.css';
import TexturaRoja from '../../images/textura-roja.png';
import TexturaClara from '../../images/textura-roja2.png';
import * as XLSX from 'xlsx';

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
  unidad?: string;
}

interface GestorViewProps {
  origenUsuario: string;
}
type EmpleadoCargado = {
  num_empleado: string;
  nombre_completo: string;
  ur: string;
  rfc: string;
  curp: string;
  nss: string;
  nivel: string;
  puesto: string;
  ubicacion: string;
  enlace: string;
  clave: string;
  modalidad: string;
  pension: string;
  origen: string;
};


export function GestorView({ origenUsuario }: GestorViewProps) {
  const [empleadosCargados, setEmpleadosCargados] =
    useState<EmpleadoCargado[]>([]);

  const origenNormalizado = origenUsuario.trim().toLowerCase();
  const origenSeleccionado: 'SC' | 'GN' =
    origenNormalizado === 'sspc' ? 'SC' : 'GN';
  const nombreOrigen =
    origenSeleccionado === 'SC' ? 'Sector Central' : 'Guardia Nacional';
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [numEmpleadoInput, setNumEmpleadoInput] = useState('');

  const [seleccionadosMap, setSeleccionadosMap] = useState<{
    [key: string]: Empleado;
  }>({});
  const [empleadosGuardadosMap, setEmpleadosGuardadosMap] = useState<{
    [key: string]: Empleado;
  }>({});
  const [loading, setLoading] = useState(false);

  const [archivoCarga, setArchivoCarga] = useState<File | null>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const archivoInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numEmpleadoInput.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Por favor, ingresa un número de empleado para realizar la búsqueda.',
        confirmButtonColor: '#800020',
      });
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('auth_token');

    try {
      const params = new URLSearchParams({
        num_empleado: numEmpleadoInput.trim(),
        origen: origenSeleccionado,
      });

      const response = await fetch(
        `${API_ENDPOINTS.MAIN}/gestor/empleados?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(data.message || 'No se pudo consultar el empleado.');
      }

      setEmpleados(data.data ?? []);

      if (!data.data || data.data.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin resultados',
          text: 'No se encontró ningún registro con ese número de empleado en el origen asignado.',
          confirmButtonColor: '#800020',
        });
      }
    } catch (error) {
      console.error('Error al obtener empleado:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al consultar el servidor.',
        confirmButtonColor: '#800020',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (emp: Empleado) => {
    const key = `${emp.origen}_${emp.num_empleado}`;

    setSeleccionadosMap((prev) => {
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
    setSeleccionadosMap((prev) => {
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
        confirmButtonColor: '#800020',
      });
      return;
    }

    const headers = [
      'Num. Empleado',
      'Origen',
      'Nombre',
      'Apellido Paterno',
      'Apellido Materno',
      'RFC',
      'CURP',
      'UR / Nivel',
      'Detalle (SS / Cargo / Modalidad)',
    ];

    const rows = empleadosParaExportar.map((emp) => {
      const detalle =
        emp.origen === 'Sector Central'
          ? `SS: ${emp.ss || 'N/A'}`
          : `Cargo: ${emp.cargo || 'N/A'} | Mod: ${emp.modalidad || 'N/A'}`;

      const unidadNivel = `UR: ${emp.unidad || 'N/A'} | Nivel: ${emp.nivel || 'N/A'
        }`;

      const valores = [
        emp.num_empleado || '',
        emp.origen || '',
        emp.nombre || '',
        emp.apellido_paterno || '',
        emp.apellido_materno || '',
        emp.rfc || '',
        emp.curp || '',
        unidadNivel,
        detalle,
      ];

      return valores
        .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
        .join(',');
    });

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
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

  const normalizarEncabezado = (valor: unknown): string =>
    String(valor ?? '')
      .replace(/\uFEFF/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

  const handleSubirArchivo = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!archivoCarga) {
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona un archivo',
        text: 'Adjunta un archivo Excel o CSV para continuar.',
        confirmButtonColor: '#800020',
      });
      return;
    }

    const extension = archivoCarga.name.split('.').pop()?.toLowerCase();

    if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
      Swal.fire({
        icon: 'error',
        title: 'Formato no válido',
        text: 'Selecciona un archivo .xlsx, .xls o .csv.',
        confirmButtonColor: '#800020',
      });
      return;
    }

    setSubiendoArchivo(true);

    try {
      const contenido = await archivoCarga.arrayBuffer();
      const libro = XLSX.read(contenido, { type: 'array', raw: false });
      const primeraHoja = libro.Sheets[libro.SheetNames[0]];

      if (!primeraHoja) {
        throw new Error('El archivo no contiene una hoja con datos.');
      }

      const filas = XLSX.utils.sheet_to_json<unknown[]>(primeraHoja, {
        header: 1,
        defval: '',
        raw: false,
      }) as unknown[][];

      const encabezadosRequeridos =
        origenSeleccionado === 'GN'
          ? [
            'NUMEMP',
            'NOMBRE',
            'UR',
            'RFC',
            'CURP',
            'NSS',
            'NIVEL',
            'PUESTO',
            'UBICACIONFISICA',
            'ENLACE',
            'CLAVE',
            'MODALIDAD',
          ]
          : [
            'NUMEMP',
            'NOMBRE',
            'UR',
            'RFC',
            'CURP',
            'NSS',
            'ENLACE',
            'NIVEL',
            'PENSIONALIMENTICIA',
          ];

      const indiceEncabezados = filas.findIndex((fila) => {
        const encabezados = fila.map(normalizarEncabezado);
        return (
          encabezados.includes('NUMEMP') &&
          encabezados.includes('NOMBRE')
        );
      });

      if (indiceEncabezados < 0) {
        throw new Error(
          'No se encontraron los encabezados NUMEMP y NOMBRE en el archivo.'
        );
      }

      const encabezados = filas[indiceEncabezados].map(
        normalizarEncabezado
      );

      const faltantes = encabezadosRequeridos.filter(
        (requerido) => !encabezados.includes(requerido)
      );

      if (faltantes.length > 0) {
        throw new Error(
          `El encabezado no corresponde al formato ${origenSeleccionado}. Faltan: ${faltantes.join(
            ', '
          )}.`
        );
      }

      const valor = (fila: unknown[], nombreColumna: string): string => {
        const posicion = encabezados.indexOf(nombreColumna);
        return posicion < 0
          ? ''
          : String(fila[posicion] ?? '').trim();
      };

      const empleadosArchivo = filas
        .slice(indiceEncabezados + 1)
        .filter((fila) =>
          fila.some((celda) => String(celda ?? '').trim() !== '')
        )
        .map((fila, indice) => {
          const empleado = {
            num_empleado: valor(fila, 'NUMEMP'),
            nombre_completo: valor(fila, 'NOMBRE'),
            ur: valor(fila, 'UR'),
            rfc: valor(fila, 'RFC'),
            curp: valor(fila, 'CURP'),
            nss: valor(fila, 'NSS'),
            nivel: valor(fila, 'NIVEL'),
            puesto: valor(fila, 'PUESTO'),
            ubicacion: valor(fila, 'UBICACIONFISICA'),
            enlace: valor(fila, 'ENLACE'),
            clave: valor(fila, 'CLAVE'),
            modalidad: valor(fila, 'MODALIDAD'),
            pension: valor(fila, 'PENSIONALIMENTICIA'),
            origen: origenSeleccionado,
          };

          const datosFaltantes = [
            !empleado.num_empleado && 'NUMEMP',
            !empleado.nombre_completo && 'NOMBRE',
            !empleado.ur && 'UR',
            !empleado.rfc && 'R.F.C.',
            !empleado.curp && 'C.U.R.P.',
          ].filter(Boolean);

          if (datosFaltantes.length > 0) {
            throw new Error(
              `La fila ${indice + indiceEncabezados + 2
              } no tiene: ${datosFaltantes.join(', ')}.`
            );
          }

          return empleado;
        });

      if (empleadosArchivo.length === 0) {
        throw new Error('El archivo no contiene filas de empleados.');
      }

      if (empleadosArchivo.length > 5000) {
        throw new Error(
          'Puedes cargar un máximo de 5,000 empleados por archivo.'
        );
      }

      const confirmacion = await Swal.fire({
        icon: 'question',
        title: 'Confirmar carga',
        text: `Se guardarán ${empleadosArchivo.length} registros de ${origenSeleccionado === 'GN'
          ? 'Guardia Nacional'
          : 'Sector Central'
          }. ¿Deseas continuar?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#800020',
        cancelButtonColor: '#6c757d',
      });

      if (!confirmacion.isConfirmed) return;

      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_ENDPOINTS.MAIN}/gestor/guardar-captura`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({ empleados: empleadosArchivo }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        const detalleErrores = Array.isArray(data.errors)
          ? ` ${data.errors.join(' ')}`
          : '';

        throw new Error(
          (data.message || 'No se pudo guardar el archivo.') +
          detalleErrores
        );
      }
      setEmpleadosCargados(empleadosArchivo);
      await Swal.fire({
        icon: 'success',
        title: 'Carga completada',
        text: `Se guardaron ${data.total ?? empleadosArchivo.length
          } registros correctamente.`,
        confirmButtonColor: '#800020',
      });

      setArchivoCarga(null);

      if (archivoInputRef.current) {
        archivoInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error al cargar archivo:', error);

      Swal.fire({
        icon: 'error',
        title: 'No se pudo cargar el archivo',
        text:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al procesar el archivo.',
        confirmButtonColor: '#800020',
      });
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const handleTerminarCaptura = async () => {
    const empleadosSeleccionados = Object.values(seleccionadosMap);

    if (empleadosSeleccionados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin selección',
        text: 'Por favor, selecciona al menos un empleado para registrar.',
        confirmButtonColor: '#800020',
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
      cancelButtonColor: '#6c757d',
    });

    if (!result.isConfirmed) return;

    const token = localStorage.getItem('auth_token');

    try {
      const response = await fetch(
        `${API_ENDPOINTS.MAIN}/gestor/guardar-captura`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({
            empleados: empleadosSeleccionados,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.status) {
        await Swal.fire({
          icon: 'success',
          title: '¡Registros guardados!',
          text: '¡Registros guardados exitosamente en la tabla registers!',
          confirmButtonColor: '#800020',
        });

        setEmpleadosGuardadosMap((prev) => ({
          ...prev,
          ...seleccionadosMap,
        }));
        setSeleccionadosMap({});
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Atención',
          text:
            data.message ||
            'Ocurrió un error al intentar guardar los registros.',
          confirmButtonColor: '#800020',
        });
      }
    } catch (error) {
      console.error('Error al guardar captura:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Error de conexión con el servidor.',
        confirmButtonColor: '#800020',
      });
    }
  };

  const listaSeleccionados = Object.entries(seleccionadosMap);
  const listaGuardados = Object.entries(empleadosGuardadosMap);

return (
  <div
    className="dashboard-container"
    style={
      { '--bg-claro': `url(${TexturaClara})` } as React.CSSProperties
    }
  >
    <aside
      className="sidebar"
      style={
        { '--bg-rojo': `url(${TexturaRoja})` } as React.CSSProperties
      }
    />

    <div className="main-content-wrapper">
      <div className="gestor-header">
        <h2 className="gestor-title">
          Selección de Personal Autorizado {nombreOrigen}
        </h2>
      </div>

      <div className="gestor-card">
        <form onSubmit={handleSearch}>
          <div className="gestor-label-group">
            <div className="gestor-radio-group" style={{ display: 'none' }}>
              <label className="gestor-radio-label">
                <input
                  type="radio"
                  name="origen"
                  value={origenSeleccionado}
                  checked
                  readOnly
                  className="gestor-radio-input"
                />
                {origenSeleccionado === 'SC'
                  ? 'Sector Central'
                  : 'Guardia Nacional'}
              </label>
            </div>
          </div>

          <div className="gestor-input-wrapper">
            <div>
              <label className="gestor-input-label">
                NÚMERO DE EMPLEADO
              </label>
              <input
                type="text"
                value={numEmpleadoInput}
                onChange={(e) => setNumEmpleadoInput(e.target.value)}
                className="gestor-text-input"
              />
            </div>

            <button type="submit" className="btn-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-search"
                viewBox="0 0 16 16"
              >
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
              </svg>{' '}
              Búsqueda por empleado
            </button>
          </div>
        </form>
      </div>

      <div className="gestor-table-card">
        <div className="gestor-table-wrapper">
          <table className="gestor-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '90px' }}>
                  Seleccionar
                </th>
                <th>Núm. Emp</th>
                <th>Origen</th>
                <th>Nombre(s)</th>
                <th>Unidad</th>
                <th>RFC</th>
                <th>CURP</th>
                <th>Nivel</th>
                <th>Pensión Alimenticia</th>
              </tr>
            </thead>

            <tbody>
              {empleados.map((emp, index) => {
                const key = `${emp.origen}_${emp.num_empleado}`;
                const isChecked = !!seleccionadosMap[key];
                const rowClass =
                  index % 2 === 0 ? 'gestor-tr-even' : 'gestor-tr-odd';

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

                    <td className="gestor-td gestor-num-emp">
                      {emp.num_empleado}
                    </td>

                    <td className="gestor-td">
                      <span
                        className={
                          emp.origen === 'Sector Central'
                            ? 'badge-sc'
                            : 'badge-gn'
                        }
                      >
                        {emp.origen}
                      </span>
                    </td>

                    <td className="gestor-td gestor-text-muted">
                      {emp.nombre} {emp.apellido_paterno}{' '}
                      {emp.apellido_materno}
                    </td>
                    <td className="gestor-td gestor-text-muted">
                      {emp.unidad}
                    </td>
                    <td className="gestor-td gestor-text-muted gestor-mono">
                      {emp.rfc}
                    </td>
                    <td className="gestor-td gestor-text-muted gestor-mono">
                      {emp.curp}
                    </td>
                    <td className="gestor-td gestor-text-muted">
                      {emp.nivel}
                    </td>
                    <td className="gestor-td gestor-text-muted">N/A</td>
                  </tr>
                );
              })}

              {empleados.length === 0 && (
                <tr>
                  <td colSpan={9} className="gestor-empty-row">
                    No hay registros para mostrar. Ingresa un número de
                    empleado y presiona el botón de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="gestor-card"
        style={{ borderLeft: '4px solid #800020' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
          }}
        >
          <div>
            <h3
              style={{
                margin: '0 0 5px 0',
                color: '#6b0f1a',
                fontSize: '16px',
              }}
            >
              Lote de Empleados Listos para Exportar (
              {listaSeleccionados.length})
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              Lista de empleados seleccionados hasta el momento
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
                <span>
                  <strong>{emp.num_empleado}</strong> - {emp.nombre} (
                  {emp.origen})
                </span>
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

      {listaGuardados.length > 0 && (
        <div
          className="gestor-card"
          style={{
            borderLeft: '4px solid #28a745',
            backgroundColor: '#f8f9fa',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px',
            }}
          >
            <div>
              <h3
                style={{
                  margin: '0 0 5px 0',
                  color: '#155724',
                  fontSize: '16px',
                }}
              >
                ✅ Registros Guardados Exitosamente (
                {listaGuardados.length})
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                Estos registros ya fueron enviados al sistema, pero puedes
                descargarlos nuevamente cuando gustes.
              </p>
            </div>

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
      )}

      {loading ? (
        <div className="gestor-loading">
          Consultando información en la base de datos institucional...
        </div>
      ) : null}

      <div
        className="gestor-card"
        style={{ borderLeft: '4px solid #28a745' }}
      >
        <h3
          style={{
            marginTop: 0,
            color: '#155724',
            fontSize: '16px',
          }}
        >
          Carga masiva de empleados.
        </h3>

        <form onSubmit={handleSubirArchivo}>
          <div className="gestor-input-wrapper">
            <div>
              <label
                className="gestor-input-label"
                htmlFor="archivo-empleados"
              >
                ARCHIVO EXCEL O CSV
              </label>
              <input
                ref={archivoInputRef}
                id="archivo-empleados"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) =>
                  setArchivoCarga(e.target.files?.[0] ?? null)
                }
                className="gestor-text-input"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={subiendoArchivo}
              style={{ marginTop: '18px' }}
            >
              {subiendoArchivo ? 'Procesando archivo...' : 'Cargar y guardar'}
            </button>
          </div>
        </form>
      </div>

      {empleadosCargados.length > 0 && (
        <div className="gestor-card">
          <h3>Datos cargados ({empleadosCargados.length})</h3>

          <div
            className="gestor-table-wrapper"
            style={{ maxHeight: 400, overflow: 'auto' }}
          >
            <table className="gestor-table">
              <thead>
                <tr>
                  <th>Núm. Emp.</th>
                  <th>Nombre</th>
                  <th>Origen</th>
                  <th>UR</th>
                  <th>RFC</th>
                  <th>CURP</th>
                  <th>NSS</th>
                  <th>Nivel</th>
                  <th>Puesto</th>
                </tr>
              </thead>
              <tbody>
                {empleadosCargados.map((emp, index) => (
                  <tr key={`${emp.origen}-${emp.num_empleado}-${index}`}>
                    <td>{emp.num_empleado}</td>
                    <td>{emp.nombre_completo}</td>
                    <td>{emp.origen}</td>
                    <td>{emp.ur}</td>
                    <td>{emp.rfc}</td>
                    <td>{emp.curp}</td>
                    <td>{emp.nss}</td>
                    <td>{emp.nivel}</td>
                    <td>{emp.puesto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  </div>
);
}