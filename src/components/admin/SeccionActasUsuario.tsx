import { useCallback, useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../../config/api';
import Swal from 'sweetalert2';

interface SeccionActasUsuarioProps {
    idUser: number | string;
}

interface TypeActa {
    id_typeActa?: number | string;
    id_typeacta?: number | string;
    ID_TYPEACTA?: number | string;
    nameType?: string;
    nametype?: string;
    NAMETYPE?: string;
}

interface DocumentoUsuario {
    idDocument?: number | string;
    iddocument?: number | string;
    IDDOCUMENT?: number | string;
    id_acta?: number | string;
    acta?: string;
    id_typeActa?: number | string;
    url?: string;
}

export function SeccionActasUsuario({ idUser }: SeccionActasUsuarioProps) {
    const [documentos, setDocumentos] = useState<DocumentoUsuario[]>([]);
    const [tiposActa, setTiposActa] = useState<TypeActa[]>([]);
    const [idTypeActaSelected, setIdTypeActaSelected] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [subiendo, setSubiendo] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [visualizandoId, setVisualizandoId] = useState<number | string | null>(null);

    const token = localStorage.getItem('auth_token');

    const obtenerIdTipoActa = (tipo: TypeActa) =>
        String(tipo.id_typeActa ?? tipo.id_typeacta ?? tipo.ID_TYPEACTA ?? '');

    const obtenerNombreTipoActa = (tipo: TypeActa) =>
        String(tipo.nameType ?? tipo.nametype ?? tipo.NAMETYPE ?? 'Sin nombre');

    const cargarDatosActas = useCallback(async () => {
        if (!idUser) return;
        setLoading(true);
        try {
            const resTipos = await fetch(`${API_ENDPOINTS.MAIN}/admin/tipos-actas`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            const dataTipos = await resTipos.json();
            if (resTipos.ok && dataTipos.status) {
                const lista = dataTipos.data || [];
                setTiposActa(lista);
                if (lista.length > 0 && !idTypeActaSelected) {
                    setIdTypeActaSelected(obtenerIdTipoActa(lista[0]));
                }
            }

            const resDocs = await fetch(`${API_ENDPOINTS.MAIN}/admin/users/${idUser}/documentos`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            const dataDocs = await resDocs.json();
            if (resDocs.ok && dataDocs.status) {
                setDocumentos(dataDocs.data || []);
            }
        } catch (err) {
            console.error('Error al cargar actas del usuario:', err);
        } finally {
            setLoading(false);
        }
    }, [idUser, token, idTypeActaSelected]);

    useEffect(() => {
        void cargarDatosActas();
    }, [cargarDatosActas]);

    const handleSubirActa = async () => {
        if (!selectedFile) return;

        const idTipoInt = Number(idTypeActaSelected);
        if (!idTypeActaSelected || !Number.isInteger(idTipoInt) || idTipoInt <= 0) {
            alert('Por favor selecciona un tipo de acta válido.');
            return;
        }

        const formData = new FormData();
        formData.append('id_user', String(idUser));
        formData.append('id_typeActa', String(idTipoInt));
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
                    text: 'Acta clasificada y cargada correctamente.',
                    confirmButtonColor: '#800020',
                });
                setSelectedFile(null);
                await cargarDatosActas();
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

    const handleVisualizarActa = async (urlActa: string | undefined, actaId: number | string) => {
        if (!urlActa) {
            alert('No hay una URL válida para esta acta.');
            return;
        }

        let rutaLimpia = urlActa.replace(/^\/api/, '');

        const urlCompleta = rutaLimpia.startsWith('http')
            ? rutaLimpia
            : `${API_ENDPOINTS.MAIN}${rutaLimpia.startsWith('/') ? '' : '/'}${rutaLimpia}`;

        console.log('🔍 URL generada para el fetch corregida:', urlCompleta);

        setVisualizandoId(actaId);
        try {
            const response = await fetch(urlCompleta, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/pdf, application/json, image/jpeg, image/png',
                },
            });

            if (!response.ok) {
                alert(`Error del servidor (${response.status}): Token inválido o expirado.`);
                return;
            }

            const contentType = response.headers.get('content-type') || 'application/pdf';

            if (contentType.includes('text/html')) {
                alert('El servidor devolvió una página HTML. El token no fue autorizado.');
                return;
            }

            const blob = await response.blob();
            const fileBlob = new Blob([blob], { type: contentType });
            const blobUrl = window.URL.createObjectURL(fileBlob);
            window.open(blobUrl, '_blank');

            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
            }, 15000);

        } catch (error: any) {
            console.error('Error al visualizar:', error);
            alert(error.message || 'Ocurrió un error al intentar abrir el documento.');
        } finally {
            setVisualizandoId(null);
        }
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
                setDocumentos((prev) => prev.filter((d) => String(d.idDocument ?? d.iddocument ?? d.IDDOCUMENT ?? d.id_acta) !== String(idDocument)));
            } else {
                alert(data.message || 'No se pudo eliminar el documento.');
            }
        } catch (err) {
            console.error('Error al eliminar acta:', err);
        }
    };

    const obtenerNombreTipoPorId = (idType: number | string) => {
        const tipo = tiposActa.find((t) => Number(obtenerIdTipoActa(t)) === Number(idType));
        return tipo ? obtenerNombreTipoActa(tipo) : `Tipo #${idType}`;
    };

    return (
        <div className="gestor-card" style={{ marginTop: '20px', borderTop: '3px solid #0284c7' }}>
            <h4 style={{ marginBottom: '15px' }}>📁 Actas y Documentos Adjuntos del Usuario</h4>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '15px' }}>
                <select
                    value={idTypeActaSelected}
                    onChange={(e) => setIdTypeActaSelected(e.target.value)}
                    className="gestor-text-input"
                    style={{ maxWidth: '240px', padding: '8px' }}
                >
                    {tiposActa.map((tipo, idx) => {
                        const idVal = obtenerIdTipoActa(tipo);
                        const nombreVal = obtenerNombreTipoActa(tipo);
                        return (
                            <option key={idVal || idx} value={idVal}>
                                {nombreVal}
                            </option>
                        );
                    })}
                </select>

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
                        const docId = doc.idDocument ?? doc.iddocument ?? doc.IDDOCUMENT ?? doc.id_acta ?? index;
                        const idTipoDoc = doc.id_typeActa ?? (doc as any).ID_TYPEACTA ?? 1;
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 'bold', color: '#374151' }}>
                                        [{obtenerNombreTipoPorId(idTipoDoc)}]
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => handleVisualizarActa(doc.url, docId)}
                                        disabled={estaAbriendo}
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
                                        {estaAbriendo ? 'Cargando...' : 'Visualizar Archivo'}
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