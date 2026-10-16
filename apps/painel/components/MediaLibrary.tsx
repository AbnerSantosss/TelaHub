import React, { useState, useEffect } from 'react';
import { listMedia, deleteMedia, uploadMedia, MediaFile } from '../services/storage';
import { Trash2, Upload, FileImage, FileVideo, File, Loader2, X, ExternalLink, Copy, CheckSquare, Square, CheckCircle2 } from 'lucide-react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useModalA11y } from '../hooks/useModalA11y';

export const MediaLibrary: React.FC<{ 
  onClose: () => void;
  onSelect?: (url: string) => void;
  allowedTypes?: 'image' | 'video' | 'all';
}> = ({ onClose, onSelect, allowedTypes = 'all' }) => {
  const [mediaParent] = useAutoAnimate<HTMLDivElement>();
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<string[] | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const modalRef = useModalA11y(true, onClose);
  const deleteModalRef = useModalA11y(filesToDelete !== null, () => setFilesToDelete(null));

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const files = await listMedia();
      setMedia(files);
    } catch (error) {
      console.error("Erro ao carregar mídia:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadMedia(file);
      await fetchMedia();
      setMessage({ text: 'Upload realizado com sucesso!', type: 'success' });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      setMessage({ text: 'Erro ao fazer upload do arquivo.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (fileNames: string[]) => {
    setFilesToDelete(fileNames);
  };

  const executeDelete = async () => {
    if (!filesToDelete || filesToDelete.length === 0) return;
    
    setLoading(true);
    try {
      const success = await deleteMedia(filesToDelete);
      if (success) {
        await fetchMedia();
        setSelectedFiles(new Set());
        setIsSelectionMode(false);
        setMessage({ text: filesToDelete.length > 1 ? `${filesToDelete.length} arquivos excluídos com sucesso!` : 'Arquivo excluído com sucesso!', type: 'success' });
      } else {
        setMessage({ text: 'Erro ao excluir arquivo(s). Verifique as permissões do banco de dados (RLS).', type: 'error' });
      }
    } catch (error) {
      console.error("Erro ao excluir arquivo:", error);
      setMessage({ text: 'Erro ao excluir arquivo(s).', type: 'error' });
    } finally {
      setLoading(false);
      setFilesToDelete(null);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedFiles(new Set());
  };

  const toggleFileSelection = (fileName: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileName)) {
      newSelection.delete(fileName);
    } else {
      newSelection.add(fileName);
    }
    setSelectedFiles(newSelection);
  };

  const selectAll = () => {
    if (selectedFiles.size === media.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(media.map(f => f.name)));
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setMessage({ text: 'URL copiada para a área de transferência!', type: 'success' });
  };

  const filteredMedia = media.filter(file => {
    if (allowedTypes === 'all') return true;
    if (allowedTypes === 'image') return file.metadata?.mimetype?.startsWith('image/');
    if (allowedTypes === 'video') return file.metadata?.mimetype?.startsWith('video/');
    return true;
  });

  const getFileIcon = (mimetype: string) => {
    if (mimetype?.startsWith('image/')) return <FileImage size={24} className="text-ok" />;
    if (mimetype?.startsWith('video/')) return <FileVideo size={24} className="text-marca" />;
    return <File size={24} className="text-tinta-3" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-tinta/50 backdrop-blur-sm p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" className="bg-papel border border-borda-2 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="p-6 border-b border-borda flex justify-between items-center bg-papel-2">
          <h3 className="font-bold text-xl text-tinta flex items-center gap-2">
            <FileImage className="text-marca" size={24}/> Biblioteca de Mídia
          </h3>
          <button onClick={onClose} className="text-tinta-3 hover:text-danger transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-borda bg-papel-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-sm text-tinta-3">
            {onSelect 
              ? 'Selecione um arquivo da biblioteca ou faça upload de um novo.'
              : 'Gerencie imagens e vídeos enviados para a plataforma.'}
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {filteredMedia.length > 0 && !onSelect && (
              <>
                {isSelectionMode ? (
                  <>
                    <button 
                      onClick={selectAll}
                      className="flex items-center gap-2 text-tinta-2 hover:text-tinta px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      {selectedFiles.size === media.length ? <CheckSquare size={18} /> : <Square size={18} />}
                      {selectedFiles.size === media.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                    {selectedFiles.size > 0 && (
                      <button 
                        onClick={() => confirmDelete(Array.from(selectedFiles))}
                        className="flex items-center gap-2 bg-danger-fundo text-danger hover:bg-danger/90 hover:text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                      >
                        <Trash2 size={18} />
                        Excluir ({selectedFiles.size})
                      </button>
                    )}
                    <button 
                      onClick={toggleSelectionMode}
                      className="flex items-center gap-2 bg-papel-3 text-tinta-2 hover:bg-borda px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={toggleSelectionMode}
                    className="flex items-center gap-2 bg-papel-3 text-tinta-2 hover:bg-borda px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <CheckSquare size={18} />
                    Selecionar Vários
                  </button>
                )}
              </>
            )}
            <label className="cursor-pointer flex items-center justify-center gap-2 bg-marca hover:bg-marca-hover text-white px-4 py-2 rounded-lg font-bold transition-all flex-1 sm:flex-none">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {uploading ? 'Enviando...' : 'Fazer Upload'}
              <input 
                type="file" 
                className="hidden" 
                accept={allowedTypes === 'image' ? 'image/*' : allowedTypes === 'video' ? 'video/*' : 'image/*,video/*'} 
                onChange={handleUpload} 
                disabled={uploading} 
              />
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-tinta-3">
              <Loader2 size={48} className="animate-spin mb-4 text-marca" />
              <p className="tracking-widest uppercase text-xs font-bold">Carregando mídia...</p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-tinta-3">
              <FileImage size={48} className="mb-4 opacity-50" />
              <p className="text-sm">Nenhum arquivo encontrado na biblioteca.</p>
            </div>
          ) : (
            <div ref={mediaParent} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((file) => {
                const isSelected = selectedFiles.has(file.name);
                return (
                <div 
                  key={file.id} 
                  className={`bg-papel-2 border rounded-xl overflow-hidden group relative flex flex-col transition-all ${
                    isSelected ? 'border-marca' : 'border-borda'
                  }`}
                  onClick={() => {
                    if (onSelect) {
                      onSelect(file.url);
                      onClose();
                    } else if (isSelectionMode) {
                      toggleFileSelection(file.name);
                    }
                  }}
                >
                  <div className={`aspect-video bg-papel flex items-center justify-center relative overflow-hidden ${onSelect || isSelectionMode ? 'cursor-pointer' : ''}`}>
                    {file.metadata?.mimetype?.startsWith('image/') ? (
                      <img src={file.url} alt={file.name} className={`w-full h-full object-cover transition-transform ${isSelected ? 'scale-105 opacity-80' : ''}`} />
                    ) : file.metadata?.mimetype?.startsWith('video/') ? (
                      <video src={file.url} className={`w-full h-full object-cover transition-transform ${isSelected ? 'scale-105 opacity-80' : ''}`} />
                    ) : (
                      getFileIcon(file.metadata?.mimetype)
                    )}
                    
                    {/* Selection Checkbox (Visible in selection mode) */}
                    {isSelectionMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-marca text-white' : 'bg-tinta/50 text-tinta-3 border border-borda'
                        }`}>
                          {isSelected && <CheckCircle2 size={16} />}
                        </div>
                      </div>
                    )}

                    {/* Overlay Actions (Hidden in selection mode) */}
                    {!isSelectionMode && !onSelect && (
                      <div className="absolute inset-0 bg-tinta/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); copyUrl(file.url); }} className="p-2 bg-papel-3 hover:bg-marca-hover text-white rounded-lg transition-colors" title="Copiar URL">
                          <Copy size={16} />
                        </button>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 bg-papel-3 hover:bg-marca-hover text-white rounded-lg transition-colors" title="Abrir em nova guia">
                          <ExternalLink size={16} />
                        </a>
                        <button onClick={(e) => { e.stopPropagation(); confirmDelete([file.name]); }} className="p-2 bg-papel-3 hover:bg-danger/90 text-white rounded-lg transition-colors" title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}

                    {onSelect && (
                      <div className="absolute inset-0 bg-marca-fundo opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-marca text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-card">
                          Selecionar
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <p className="text-xs font-medium text-tinta truncate mb-1" title={file.name}>{file.name}</p>
                    <div className="flex justify-between items-center text-[10px] text-tinta-3">
                      <span>{formatSize(file.metadata?.size)}</span>
                      <span className="uppercase">{file.metadata?.mimetype?.split('/')[1] || 'FILE'}</span>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-card border flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[110] ${
          message.type === 'success' ? 'bg-ok-fundo border-ok/30 text-ok' :
          message.type === 'error' ? 'bg-danger-fundo border-danger/30 text-danger' :
          'bg-papel border-borda-2 text-tinta'
        }`}>
          <p className="text-sm font-medium">{message.text}</p>
          <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {filesToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-tinta/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div ref={deleteModalRef} role="dialog" aria-modal="true" className="bg-papel border border-borda-2 rounded-2xl shadow-modal w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-danger-fundo text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-tinta mb-2">
                {filesToDelete.length > 1 ? `Excluir ${filesToDelete.length} arquivos?` : 'Excluir arquivo?'}
              </h3>
              <p className="text-sm text-tinta-3 mb-6">
                {filesToDelete.length > 1 ? (
                  <>Tem certeza que deseja excluir os <strong>{filesToDelete.length}</strong> arquivos selecionados? Esta ação não pode ser desfeita.</>
                ) : (
                  <>Tem certeza que deseja excluir o arquivo <span className="text-tinta font-medium break-all">{filesToDelete[0]}</span>? Esta ação não pode ser desfeita.</>
                )}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setFilesToDelete(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-papel-3 text-tinta-2 hover:bg-borda transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-danger text-white hover:bg-danger/90 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
