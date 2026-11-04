import { useCallback, useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../../config/api';
import Swal from 'sweetalert2';

interface SeccionDocumentosAnexosProps {
  idRegister: number | string;
  idTypeDocumentAnexo?: number; // <-- Añadido para evitar el error de TypeScript
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

interface SeccionDocumentosAnexosProps {
  idRegister: number | string;
}

export function SeccionDocumentosAnexos({ idRegister, idTypeDocumentAnexo }: SeccionDocumentosAnexosProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TypeDocument[]>([]);
  const [idTypeDocumentSelected, setIdTypeDocumentSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const token = localStorage.getItem('auth_token');

  // Helpers robustos para tolerar cualquier variante de mayúsculas/minúsculas de Oracle
  const obtenerIdTipoCatalogo = (tipo: TypeDocument) =>
    String(tipo.idTypeDocument ?? tipo.IDTYPEDOCUMENT ?? tipo.idtypedocument ?? '');

  const obtenerNombreTipoCatalogo = (tipo: TypeDocument) =>
    String(tipo.nameType ?? tipo.NAMETYPE ?? tipo.nametype ?? 'Sin nombre');

  const obtenerIdTipoDeDoc = (doc: Documento) =>
    Number(doc.idTypeDocument ?? doc.IDTYPEDOCUMENT ?? doc.idtypedocument ?? 0);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Obtener catálogo de tipos de documentos primero para tener la referencia de nombres
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

      // 2. Obtener documentos del registro
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

  return (
    <div className="gestor-card" style={{ marginTop: '15px' }}>
      <h3>Documentos Anexos y Clasificación</h3>

      {/* Controles de carga y selección de tipo */}
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
              title="Eliminar archivo antes de definirlo"
            >
              🗑️ Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Listado de Documentos */}
      {loading ? (
        <p>Cargando documentos anexos...</p>
      ) : documentos.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {documentos.map((doc, index) => {
            const docId = doc.idDocument ?? doc.iddocument ?? doc.IDDOCUMENT ?? index;
            const idTipoDoc = obtenerIdTipoDeDoc(doc);
            return (
              <div
                key={String(docId)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                }}
              >
                <div>
                  <span style={{ fontWeight: 'bold', color: '#374151', marginRight: '8px' }}>
                    [{obtenerNombreTipoPorId(idTipoDoc)}]
                  </span>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>
                    📄 Visualizar Archivo
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleEliminarDocumento(docId)}
                  style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
                >
                  🗑️ Eliminar
                </button>
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