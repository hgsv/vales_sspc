import { useCallback, useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../../config/api';
import Swal from 'sweetalert2';

interface SeccionActasUsuarioProps {
    idUser: number | string;
}

interface DocumentoUsuario {
    idDocument?: number | string;
    iddocument?: number | string;
    IDDOCUMENT?: number | string;
    document?: string;
    idTypeDocument?: number | string;
    IDTYPEDOCUMENT?: number | string;
    status?: number | string;
    url?: string;
}

export function SeccionActasUsuario({ idUser }: SeccionActasUsuarioProps) {
    const [documentos, setDocumentos] = useState<DocumentoUsuario[]>([]);
    const [loading, setLoading] = useState(false);
    const [subiendo, setSubiendo] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [nombreDocumento, setNombreDocumento] = useState('Acta Administrativa / Documento');

    const token = localStorage.getItem('auth_token');

    const cargarDocumentos = useCallback(async () => {
        if (!idUser) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_ENDPOINTS.MAIN}/admin/users/${idUser}/documentos`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            const data = await res.json();
            if (res.ok && data.status) {
                setDocumentos(data.data || []);
            }
        } catch (err) {
            console.error('Error al cargar actas del usuario:', err);
        } finally {
            setLoading(false);
        }
    }, [idUser, token]);

    useEffect(() => {
        void cargarDocumentos();
    }, [cargarDocumentos]);

    const handleSubirActa = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('id_user', String(idUser));
        formData.append('nombre_documento', nombreDocumento);
        formData.append('archivo', selectedFile);

        setSubiendo(true);
        try {
            const res = await fetch(`${API_ENDPOINTS.MAIN}/admin/users/documentos/cargar`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.status) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Acta cargada correctamente.',
                    confirmButtonColor: '#800020',
                });
                setSelectedFile(null);
                setNombreDocumento('Acta Administrativa / Documento');
                await cargarDocumentos();
            } else {
                alert(data.message || 'Error al subir el acta.');
            }
        } catch (error) {
            console.error('Error al subir acta:', error);
            alert('Error de conexión al subir el archivo.');
        } finally {
            setSubiendo(false);
        }
    };

    const handleVisualizarActa = (url: string | undefined) => {
        if (!url) return;
        window.open(url, '_blank');
    };

    const handleEliminarActa = async (idDocument: number | string | undefined) => {
        if (!idDocument) return;

        const confirm = await Swal.fire({
            title: '¿Eliminar acta?',
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
            const res = await fetch(`${API_ENDPOINTS.MAIN}/admin/users/documentos/${idDocument}`, {
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
            console.error('Error al eliminar acta:', err);
        }
    };

    return (
        <div className="gestor-card" style={{ marginTop: '20px', borderTop: '3px solid #0284c7' }}>
            <h4 style={{ marginBottom: '15px' }}>📁 Actas y Documentos Adjuntos del Usuario</h4>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '15px' }}>
                <input
                    type="text"
                    placeholder="Descripción del documento"
                    value={nombreDocumento}
                    onChange={(e) => setNombreDocumento(e.target.value)}
                    className="gestor-text-input"
                    style={{ maxWidth: '250px', padding: '8px' }}
                />

                <input
                    type="file"
                    id={`input-file-user-${idUser}`}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                />

                <label
                    htmlFor={`input-file-user-${idUser}`}
                    className="btn-primary"
                    style={{ cursor: 'pointer', backgroundColor: '#0284c7', margin: 0, padding: '8px 14px' }}
                >
                    📂 Seleccionar Archivo
                </label>

                {selectedFile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f3f4f6', padding: '6px 10px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{selectedFile.name}</span>
                        <button
                            type="button"
                            onClick={handleSubirActa}
                            disabled={subiendo}
                            className="btn-primary"
                            style={{ backgroundColor: '#16a34a', border: 'none', padding: '4px 10px', fontSize: '12px' }}
                        >
                            {subiendo ? 'Guardando...' : '✅ Subir Acta'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <p>Cargando actas...</p>
            ) : documentos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {documentos.map((doc, index) => {
                        const docId = doc.idDocument ?? doc.iddocument ?? doc.IDDOCUMENT ?? index;
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#374151' }}>
                                        {doc.document || `Documento #${index + 1}`}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => handleVisualizarActa(doc.url)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#0284c7',
                                            textDecoration: 'underline',
                                            cursor: 'pointer',
                                            padding: 0,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Visualizar Archivo
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleEliminarActa(docId)}
                                    style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                >
                                    🗑️ Eliminar
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>No hay actas o documentos registrados para este usuario.</p>
            )}
        </div>
    );
}