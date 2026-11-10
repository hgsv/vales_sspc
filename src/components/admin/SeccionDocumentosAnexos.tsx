import { useCallback, useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../../config/api';
import Swal from 'sweetalert2';

interface SeccionDocumentosAnexosProps {
  idRegister: number | string;
  idType?: number | null;
}

interface Documento {
  idDocument?: number | string;
  iddocument?: number | string;
  IDDOCUMENT?: number | string;
  document?: string;
  idTypeDocument?: number | string;
  IDTYPEDOCUMENT?: number | string;
  idtypedocument?: number | string;
  idRegister?: number | string;
  status?: number | string;
  url?: string;
}

interface TypeDocument {
  idTypeDocument?: number | string;
  IDTYPEDOCUMENT?: number | string;
  idtypedocument?: number | string;
  nameType?: string;
  NAMETYPE?: string;
  nametype?: string;
}

export function SeccionDocumentosAnexos({ idRegister, idType }: SeccionDocumentosAnexosProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TypeDocument[]>([]);
  const [idTypeDocumentSelected, setIdTypeDocumentSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visualizandoId, setVisualizandoId] = useState<number | string | null>(null);

  const token = localStorage.getItem('auth_token');

  const obtenerIdTipoCatalogo = (tipo: TypeDocument) =>
    String(tipo.idTypeDocument ?? tipo.IDTYPEDOCUMENT ?? tipo.idtypedocument ?? '');

  const obtenerNombreTipoCatalogo = (tipo: TypeDocument) =>
    String(tipo.nameType ?? tipo.NAMETYPE ?? tipo.nametype ?? 'Sin nombre');

  const obtenerIdTipoDeDoc = (doc: Documento) =>
    Number(doc.idTypeDocument ?? doc.IDTYPEDOCUMENT ?? doc.idtypedocument ?? 0);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const resTipos = await fetch(`${API_ENDPOINTS.MAIN}/gestor/tipos-documentos`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const dataTipos = await resTipos.json();
      let listaTipos: TypeDocument[] = [];
      if (resTipos.ok && dataTipos.status) {
        listaTipos = dataTipos.data || [];
        setTiposDocumento(listaTipos);
        
        if (listaTipos.length > 0 && !idTypeDocumentSelected) {
          setIdTypeDocumentSelected(obtenerIdTipoCatalogo(listaTipos[0]));
        }
      }

      const resDocs = await fetch(
        `${API_ENDPOINTS.MAIN}/gestor/documentos/registro/${idRegister}`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        }
      );
      const dataDocs = await resDocs.json();
      if (resDocs.ok && dataDocs.status) {
        setDocumentos(dataDocs.data || []);
      }
    } catch (err) {
      console.error('Error al cargar datos de documentos:', err);
    } finally {
      setLoading(false);
    }
  }, [idRegister, token, idTypeDocumentSelected]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const handleSubirDocumento = async () => {
    if (!selectedFile) return;
    
    const idTipoInt = Number(idTypeDocumentSelected);
    if (!idTypeDocumentSelected || !Number.isInteger(idTipoInt) || idTipoInt <= 0) {
      alert('Por favor selecciona una clasificación válida.');
      return;
    }

    const formData = new FormData();
    formData.append('idRegister', String(idRegister));
    formData.append('idTypeDocument', String(idTipoInt));
    formData.append('archivo', selectedFile);

    setSubiendo(true);
    try {
      const res = await fetch(`${API_ENDPOINTS.MAIN}/gestor/documentos/cargar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.status) {
        await Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Documento clasificado y cargado correctamente.',
          confirmButtonColor: '#800020',
        });
        setSelectedFile(null);
        await cargarDatos();
      } else {
        alert(data.message || 'Error al subir documento.');
      }
    } catch (error) {
      console.error('Error al cargar archivo:', error);
      alert('Error de conexión al subir el archivo.');
    } finally {
      setSubiendo(false);
    }
  };

  const handleVisualizarDocumento = async (urlDocumento: string | undefined, docId: number | string) => {
    if (!urlDocumento) {
      alert('No hay una URL válida para este documento.');
      return;
    }

    setVisualizandoId(docId);
    try {
      const response = await fetch(urlDocumento, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf, application/json, image/jpeg, image/png',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No se pudo cargar el archivo para visualizar.');
      }

      const blob = await response.blob();
      const contentType = response.headers.get('content-type') || 'application/pdf';
      const fileBlob = new Blob([blob], { type: contentType });
      
      const blobUrl = window.URL.createObjectURL(fileBlob);
      window.open(blobUrl, '_blank');

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 15000);

    } catch (error) {
      console.error('Error al visualizar:', error);
      alert('Ocurrió un error al intentar abrir el documento.');
    } finally {
      setVisualizandoId(null);
    }
  };

  const handleCambiarEstatusDocumento = async (idDocument: number | string, nuevoStatus: number) => {
    setProcesandoId(idDocument);
    try {
      const res = await fetch(`${API_ENDPOINTS.MAIN}/admin/documentos/${idDocument}/estatus`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({ status: nuevoStatus }),
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setDocumentos((prev) =>
          prev.map((d) => {
            const currentId = String(d.idDocument ?? d.iddocument ?? d.IDDOCUMENT);
            if (currentId === String(idDocument)) {
              return { ...d, status: nuevoStatus };
            }
            return d;
          })
        );
      } else {
        alert(data.message || 'No se pudo actualizar el estatus del documento.');
      }
    } catch (err) {
      console.error('Error al actualizar estatus:', err);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleEliminarDocumento = async (idDocument: number | string | undefined) => {
    if (!idDocument) return;

    const confirm = await Swal.fire({
      title: '¿Eliminar documento?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`${API_ENDPOINTS.MAIN}/gestor/documentos/${idDocument}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setDocumentos((prev) => prev.filter((d) => String(d.idDocument ?? d.iddocument ?? d.IDDOCUMENT) !== String(idDocument)));
      } else {
        alert(data.message || 'No se pudo eliminar el documento.');
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  const obtenerNombreTipoPorId = (idType: number) => {
    const tipo = tiposDocumento.find((t) => Number(obtenerIdTipoCatalogo(t)) === Number(idType));
    return tipo ? obtenerNombreTipoCatalogo(tipo) : `Tipo #${idType}`;
  };

  const todosAceptados = documentos.length > 0 && documentos.every((doc) => Number(doc.status ?? 0) === 1);

  return (
    <div className="gestor-card" style={{ marginTop: '15px' }}>
      <h3>Documentos Anexos y Clasificación</h3>

      {!todosAceptados ? (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '15px' }}>
          <select
            value={idTypeDocumentSelected}
            onChange={(e) => setIdTypeDocumentSelected(e.target.value)}
            className="gestor-text-input"
            style={{ maxWidth: '220px' }}
          >
            {tiposDocumento.map((tipo, idx) => {
              const idVal = obtenerIdTipoCatalogo(tipo);
              const nombreVal = obtenerNombreTipoCatalogo(tipo);
              return (
                <option key={idVal || idx} value={idVal}>
                  {nombreVal}
                </option>
              );
            })}
          </select>

          <input
            type="file"
            id={`input-file-${idRegister}`}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />

          <label
            htmlFor={`input-file-${idRegister}`}
            className="btn-primary"
            style={{ cursor: 'pointer', backgroundColor: '#0284c7', margin: 0, padding: '8px 14px' }}
          >
            📁 Seleccionar Archivo
          </label>

          {selectedFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f3f4f6', padding: '6px 10px', borderRadius: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{selectedFile.name}</span>
              <button
                type="button"
                onClick={handleSubirDocumento}
                disabled={subiendo}
                className="btn-primary"
                style={{ backgroundColor: '#16a34a', border: 'none', padding: '4px 10px', fontSize: '12px' }}
              >
                {subiendo ? 'Guardando...' : '✅ Subir Anexo'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
                title="Cancelar"
              >
                🗑️ Cancelar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
          ✅ Todos los documentos anexos han sido aceptados. Ya no es posible cargar más archivos.
        </div>
      )}

      {loading ? (
        <p>Cargando documentos anexos...</p>
      ) : documentos.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {documentos.map((doc, index) => {
            const docId = doc.idDocument ?? doc.iddocument ?? doc.IDDOCUMENT ?? index;
            const idTipoDoc = obtenerIdTipoDeDoc(doc);
            const statusDoc = Number(doc.status ?? 0);
            const esAceptado = statusDoc === 1;
            const estaAbriendo = visualizandoId === docId;

            return (
              <div
                key={String(docId)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'bold', color: '#374151' }}>
                    [{obtenerNombreTipoPorId(idTipoDoc)}]
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleVisualizarDocumento(doc.url, docId)}
                    disabled={estaAbriendo}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      font: 'inherit',
                      fontWeight: 500,
                    }}
                  >
                    {estaAbriendo ? 'Cargando...' : 'Visualizar Archivo'}
                  </button>

                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: esAceptado ? '#dcfce7' : '#fee2e2',
                      color: esAceptado ? '#166534' : '#991b1b',
                    }}
                  >
                    {esAceptado ? 'Aceptado (1)' : 'Pendiente / No aceptado (0)'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {idType === 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCambiarEstatusDocumento(docId, 1)}
                        disabled={procesandoId === docId || esAceptado}
                        style={{
                          backgroundColor: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCambiarEstatusDocumento(docId, 0)}
                        disabled={procesandoId === docId || !esAceptado}
                        style={{
                          backgroundColor: '#ca8a04',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      >
                        Rechazar
                      </button>
                    </>
                  )}

                  {!esAceptado && (
                    <button
                      type="button"
                      onClick={() => handleEliminarDocumento(docId)}
                      style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                    >
                      🗑️ Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>No hay documentos anexos clasificados.</p>
      )}
    </div>
  );
}