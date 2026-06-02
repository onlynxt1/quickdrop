/**
 * VaultPage — secure encrypted personal file storage
 * Files are encrypted server-side with AES-256-CBC; only the owner can decrypt them.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import styles from './VaultPage.module.css';

// ── Constants ─────────────────────────────────────────────────
const FOLDER_COLORS = ['#0A84FF', '#30D158', '#FF9F0A', '#BF5AF2', '#FF6B6B', '#4ECDC4', '#FF453A'];

// ── Helpers ───────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getFileIcon(mime) {
  if (!mime) return '📎';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime === 'application/pdf') return '📄';
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar') || mime.includes('7z')) return '📦';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('sheet') || mime.includes('excel')) return '📊';
  if (mime.startsWith('text/')) return '📝';
  return '📎';
}

const isImage = m => m?.startsWith('image/');
const isVideo = m => m?.startsWith('video/');
const isAudio = m => m?.startsWith('audio/');

// ── VaultThumbnail ─────────────────────────────────────────────
// Loads an image blob URL from auth-protected preview endpoint; null for non-images
function VaultThumbnail({ fileId, mimeType }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!isImage(mimeType)) return;
    let objectUrl = null;
    const controller = new AbortController();
    axios.get(`/api/vault/files/${fileId}/preview`, {
      responseType: 'blob',
      signal: controller.signal,
    }).then(res => {
      objectUrl = URL.createObjectURL(res.data);
      setUrl(objectUrl);
    }).catch(() => {});
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, mimeType]);

  if (!isImage(mimeType)) return null;
  if (url) return <img src={url} alt="" className={styles.thumbImg} />;
  return null;
}

// ── FolderTreeItem ─────────────────────────────────────────────
function FolderTreeItem({ folder, allFolders, current, onSelect, onRenameClick, onDeleteClick, depth = 0 }) {
  const children = allFolders.filter(f => f.parent_id === folder.id);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div
        className={`${styles.folderItem} ${current === folder.id ? styles.folderActive : ''}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => onSelect(folder.id)}
      >
        <button
          className={styles.folderToggle}
          onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        >
          {children.length > 0 ? (open ? '▾' : '▸') : ''}
        </button>
        <span className={styles.folderDot} style={{ background: folder.color || '#0A84FF' }} />
        <span className={styles.folderName}>{folder.name}</span>
        <div className={styles.folderActions}>
          <button onClick={e => { e.stopPropagation(); onRenameClick(folder); }} title="Rename">✏️</button>
          <button onClick={e => { e.stopPropagation(); onDeleteClick(folder); }} title="Delete">🗑️</button>
        </div>
      </div>
      {open && children.map(child => (
        <FolderTreeItem
          key={child.id}
          folder={child}
          allFolders={allFolders}
          current={current}
          onSelect={onSelect}
          onRenameClick={onRenameClick}
          onDeleteClick={onDeleteClick}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

// ── PreviewModal ───────────────────────────────────────────────
function PreviewModal({ file, onClose, onDownload }) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [loadingMedia, setLoadingMedia] = useState(false);

  useEffect(() => {
    if (!file || (!isImage(file.mime_type) && !isVideo(file.mime_type) && !isAudio(file.mime_type))) return;
    let objectUrl = null;
    const controller = new AbortController();
    setLoadingMedia(true);
    axios.get(`/api/vault/files/${file.id}/preview`, {
      responseType: 'blob',
      signal: controller.signal,
    }).then(res => {
      objectUrl = URL.createObjectURL(res.data);
      setMediaUrl(objectUrl);
    }).catch(() => {}).finally(() => setLoadingMedia(false));
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file?.id]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!file) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.previewModal} onClick={e => e.stopPropagation()}>
        <div className={styles.previewHeader}>
          <span className={styles.previewTitle}>{file.name}</span>
          <div className={styles.previewHeaderActions}>
            <button className={styles.previewDownloadBtn} onClick={() => onDownload(file)}>↓ Download</button>
            <button className={styles.previewCloseBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.previewBody}>
          {loadingMedia && (
            <div className={styles.previewLoading}>
              <div className={styles.spinner} />
              <p>Decrypting…</p>
            </div>
          )}
          {!loadingMedia && isImage(file.mime_type) && mediaUrl && (
            <img src={mediaUrl} alt={file.name} className={styles.previewImage} />
          )}
          {!loadingMedia && isVideo(file.mime_type) && mediaUrl && (
            <video src={mediaUrl} controls autoPlay className={styles.previewVideo} />
          )}
          {!loadingMedia && isAudio(file.mime_type) && mediaUrl && (
            <div className={styles.previewAudio}>
              <div className={styles.previewAudioIcon}>🎵</div>
              <audio src={mediaUrl} controls autoPlay className={styles.audioPlayer} />
            </div>
          )}
          {!isImage(file.mime_type) && !isVideo(file.mime_type) && !isAudio(file.mime_type) && (
            <div className={styles.previewGeneric}>
              <div className={styles.previewGenericIcon}>{getFileIcon(file.mime_type)}</div>
              <p className={styles.previewFileName}>{file.name}</p>
              <p className={styles.previewFileMeta}>{formatBytes(file.size)} · {file.mime_type}</p>
              <button className={styles.previewDownloadBig} onClick={() => onDownload(file)}>Download File</button>
            </div>
          )}
        </div>

        <div className={styles.previewFooter}>
          <span>{formatBytes(file.size)}</span>
          <span>{file.mime_type || 'Unknown type'}</span>
          <span>Added {formatDate(file.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ── FileCard (grid view) ───────────────────────────────────────
function FileCard({ file, onPreview, onDownload, onRename, onMove, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  return (
    <div className={styles.fileCard} onClick={() => onPreview(file)}>
      <div className={styles.fileCardThumb}>
        <VaultThumbnail fileId={file.id} mimeType={file.mime_type} />
        {!isImage(file.mime_type) && (
          <span className={styles.fileTypeIcon}>{getFileIcon(file.mime_type)}</span>
        )}
        {isVideo(file.mime_type) && (
          <span className={styles.videoOverlay}>▶</span>
        )}
      </div>
      <div className={styles.fileCardBody}>
        <p className={styles.fileCardName} title={file.name}>{file.name}</p>
        <p className={styles.fileCardMeta}>{formatBytes(file.size)}</p>
      </div>
      <div className={styles.fileCardMenu} ref={menuRef} onClick={e => e.stopPropagation()}>
        <button className={styles.menuDots} onClick={() => setMenuOpen(o => !o)}>···</button>
        {menuOpen && (
          <div className={styles.dropdownMenu}>
            <button onClick={() => { setMenuOpen(false); onPreview(file); }}>👁 Preview</button>
            <button onClick={() => { setMenuOpen(false); onDownload(file); }}>↓ Download</button>
            <button onClick={() => { setMenuOpen(false); onRename(file); }}>✏️ Rename</button>
            <button onClick={() => { setMenuOpen(false); onMove(file); }}>📂 Move</button>
            <button className={styles.menuDeleteBtn} onClick={() => { setMenuOpen(false); onDelete(file); }}>🗑 Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── FileRow (list view) ────────────────────────────────────────
function FileRow({ file, folders, onPreview, onDownload, onRename, onMove, onDelete }) {
  const folder = folders.find(f => f.id === file.folder_id);

  return (
    <div className={styles.fileRow} onClick={() => onPreview(file)}>
      <div className={styles.fileRowIcon}>{getFileIcon(file.mime_type)}</div>
      <div className={styles.fileRowName}>
        <span title={file.name}>{file.name}</span>
        {folder && (
          <span className={styles.fileRowFolder} style={{ background: (folder.color || '#0A84FF') + '22', color: folder.color || '#0A84FF' }}>
            {folder.name}
          </span>
        )}
      </div>
      <div className={styles.fileRowMeta}>{formatBytes(file.size)}</div>
      <div className={styles.fileRowDate}>{formatDate(file.created_at)}</div>
      <div className={styles.fileRowActions} onClick={e => e.stopPropagation()}>
        <button onClick={() => onDownload(file)} title="Download">↓</button>
        <button onClick={() => onRename(file)} title="Rename">✏️</button>
        <button onClick={() => onMove(file)} title="Move">📂</button>
        <button className={styles.rowDeleteBtn} onClick={() => onDelete(file)} title="Delete">🗑</button>
      </div>
    </div>
  );
}

// ── VaultPage ──────────────────────────────────────────────────
export default function VaultPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [folders, setFolders]             = useState([]);
  const [files, setFiles]                 = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = All Files
  const [view, setView]                   = useState('grid');
  const [search, setSearch]               = useState('');
  const [stats, setStats]                 = useState({ count: 0, total_size: 0 });
  const [loading, setLoading]             = useState(true);
  const [uploading, setUploading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver]           = useState(false);
  const [previewFile, setPreviewFile]     = useState(null);

  // Modals
  const [folderModal, setFolderModal] = useState(null); // { mode:'new'|'rename', folder?, name }
  const [renameModal, setRenameModal] = useState(null); // { file, name }
  const [moveModal, setMoveModal]     = useState(null); // { file, folderId }
  const [deleteModal, setDeleteModal] = useState(null); // { type:'file'|'folder', item }

  const fileInputRef = useRef();

  // ── Auth guard ──────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth', { state: { from: '/vault' } });
  }, [authLoading, user, navigate]);

  // ── Data loading ────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    const res = await axios.get('/api/vault/folders');
    setFolders(res.data.folders);
  }, []);

  const loadFiles = useCallback(async (folderId, query) => {
    const params = {};
    if (folderId !== null) params.folder_id = folderId ?? '';
    if (query) params.search = query;
    const res = await axios.get('/api/vault/files', { params });
    setFiles(res.data.files);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await axios.get('/api/vault/stats');
    setStats(res.data);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([loadFolders(), loadFiles(null, ''), loadStats()])
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadFiles(currentFolderId, search);
  }, [currentFolderId, search, user]);

  // ── Upload ──────────────────────────────────────────────────
  const handleUpload = useCallback(async (fileList) => {
    if (!fileList?.length) return;
    setUploading(true);
    setUploadProgress(0);
    const total = fileList.length;

    for (let i = 0; i < total; i++) {
      const f = fileList[i];
      const form = new FormData();
      form.append('file', f);
      if (currentFolderId) form.append('folder_id', currentFolderId);
      try {
        await axios.post('/api/vault/files/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: e => {
            const pct = Math.round(((i + (e.loaded / e.total)) / total) * 100);
            setUploadProgress(pct);
          },
        });
      } catch (err) {
        console.error('[Vault] Upload failed:', err.response?.data?.error || err.message);
      }
    }

    await Promise.all([loadFiles(currentFolderId, search), loadStats()]);
    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [currentFolderId, search, loadFiles, loadStats]);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }

  // ── Download ────────────────────────────────────────────────
  async function handleDownload(file) {
    try {
      const res = await axios.get(`/api/vault/files/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('[Vault] Download failed:', err.message);
    }
  }

  // ── Folder CRUD ─────────────────────────────────────────────
  async function submitFolderModal() {
    const name = folderModal?.name?.trim();
    if (!name) return;
    if (folderModal.mode === 'new') {
      const color = FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
      await axios.post('/api/vault/folders', { name, color });
    } else {
      await axios.put(`/api/vault/folders/${folderModal.folder.id}`, { name });
    }
    await loadFolders();
    setFolderModal(null);
  }

  async function handleDeleteFolder(folder) {
    await axios.delete(`/api/vault/folders/${folder.id}`);
    if (currentFolderId === folder.id) setCurrentFolderId(null);
    await Promise.all([loadFolders(), loadFiles(currentFolderId === folder.id ? null : currentFolderId, search)]);
    setDeleteModal(null);
  }

  // ── File CRUD ───────────────────────────────────────────────
  async function handleRenameFile() {
    const name = renameModal?.name?.trim();
    if (!name) return;
    await axios.put(`/api/vault/files/${renameModal.file.id}`, { name });
    await loadFiles(currentFolderId, search);
    setRenameModal(null);
  }

  async function handleMoveFile() {
    const folderId = moveModal?.folderId === '' ? null : moveModal?.folderId;
    await axios.put(`/api/vault/files/${moveModal.file.id}`, { folder_id: folderId });
    await loadFiles(currentFolderId, search);
    setMoveModal(null);
  }

  async function handleDeleteFile(file) {
    await axios.delete(`/api/vault/files/${file.id}`);
    await Promise.all([loadFiles(currentFolderId, search), loadStats()]);
    if (previewFile?.id === file.id) setPreviewFile(null);
    setDeleteModal(null);
  }

  // ── Derived ─────────────────────────────────────────────────
  const rootFolders = folders.filter(f => !f.parent_id);
  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

  // ── Render ───────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div
      className={`${styles.vaultPage} ${dragOver ? styles.dragOver : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
      onDrop={handleDrop}
    >
      {/* ══ Sidebar ══════════════════════════════════════════ */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.lockIcon}>🔒</span>
          <span className={styles.sidebarTitle}>My Vault</span>
        </div>

        <nav className={styles.folderNav}>
          <button
            className={`${styles.allFilesBtn} ${currentFolderId === null ? styles.allFilesActive : ''}`}
            onClick={() => { setCurrentFolderId(null); setSearch(''); }}
          >
            <span>📂</span> All Files
          </button>

          {rootFolders.length > 0 && <div className={styles.sidebarDivider} />}

          {rootFolders.map(folder => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              allFolders={folders}
              current={currentFolderId}
              onSelect={id => { setCurrentFolderId(id); setSearch(''); }}
              onRenameClick={f => setFolderModal({ mode: 'rename', folder: f, name: f.name })}
              onDeleteClick={f => setDeleteModal({ type: 'folder', item: f })}
            />
          ))}
        </nav>

        <button
          className={styles.newFolderBtn}
          onClick={() => setFolderModal({ mode: 'new', name: '' })}
        >
          + New Folder
        </button>

        <div className={styles.sidebarStats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Files</span>
            <span className={styles.statValue}>{stats.count}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Used</span>
            <span className={styles.statValue}>{formatBytes(stats.total_size)}</span>
          </div>
        </div>
      </aside>

      {/* ══ Main Content ═════════════════════════════════════ */}
      <div className={styles.mainContent}>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.breadcrumb}>
            <button className={styles.breadcrumbItem} onClick={() => { setCurrentFolderId(null); setSearch(''); }}>
              Vault
            </button>
            {currentFolder && (
              <>
                <span className={styles.breadcrumbSep}>/</span>
                <span className={styles.breadcrumbCurrent} style={{ color: currentFolder.color || '#0A84FF' }}>
                  {currentFolder.name}
                </span>
              </>
            )}
          </div>

          <div className={styles.toolbarRight}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                className={styles.searchInput}
                placeholder="Search files…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewBtn} ${view === 'grid' ? styles.viewActive : ''}`}
                onClick={() => setView('grid')}
                title="Grid view"
              >⊞</button>
              <button
                className={`${styles.viewBtn} ${view === 'list' ? styles.viewActive : ''}`}
                onClick={() => setView('list')}
                title="List view"
              >☰</button>
            </div>

            <button
              className={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? `${uploadProgress}%` : '↑ Upload'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleUpload(e.target.files)}
            />
          </div>
        </div>

        {uploading && (
          <div className={styles.uploadProgressBar}>
            <div className={styles.uploadProgressFill} style={{ width: `${uploadProgress}%` }} />
          </div>
        )}

        {/* File area */}
        <div className={styles.fileArea}>
          {loading ? (
            <div className={styles.emptyState}>
              <div className={styles.spinner} />
            </div>
          ) : files.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                {search ? '🔍' : '🔒'}
              </div>
              <h3 className={styles.emptyTitle}>
                {search
                  ? 'No files match your search'
                  : currentFolderId
                  ? 'This folder is empty'
                  : 'Your vault is empty'}
              </h3>
              <p className={styles.emptySubtitle}>
                {search
                  ? 'Try a different search term'
                  : 'Drop files here or click Upload — everything is encrypted automatically'}
              </p>
              {!search && (
                <button className={styles.emptyUploadBtn} onClick={() => fileInputRef.current?.click()}>
                  Upload Files
                </button>
              )}
            </div>
          ) : view === 'grid' ? (
            <div className={styles.fileGrid}>
              {files.map(file => (
                <FileCard
                  key={file.id}
                  file={file}
                  onPreview={setPreviewFile}
                  onDownload={handleDownload}
                  onRename={f => setRenameModal({ file: f, name: f.name })}
                  onMove={f => setMoveModal({ file: f, folderId: f.folder_id || '' })}
                  onDelete={f => setDeleteModal({ type: 'file', item: f })}
                />
              ))}
            </div>
          ) : (
            <div className={styles.fileList}>
              <div className={styles.listHeader}>
                <div />
                <div>Name</div>
                <div>Size</div>
                <div>Added</div>
                <div />
              </div>
              {files.map(file => (
                <FileRow
                  key={file.id}
                  file={file}
                  folders={folders}
                  onPreview={setPreviewFile}
                  onDownload={handleDownload}
                  onRename={f => setRenameModal({ file: f, name: f.name })}
                  onMove={f => setMoveModal({ file: f, folderId: f.folder_id || '' })}
                  onDelete={f => setDeleteModal({ type: 'file', item: f })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      {dragOver && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragOverlayContent}>
            <div className={styles.dragIcon}>☁️</div>
            <p>Drop to encrypt &amp; upload</p>
          </div>
        </div>
      )}

      {/* ══ Preview Modal ═════════════════════════════════════ */}
      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      {/* ══ Folder Modal (new / rename) ══════════════════════ */}
      {folderModal && (
        <div className={styles.modalBackdrop} onClick={() => setFolderModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {folderModal.mode === 'new' ? 'New Folder' : 'Rename Folder'}
            </h3>
            <input
              className={styles.modalInput}
              placeholder="Folder name"
              value={folderModal.name}
              autoFocus
              onChange={e => setFolderModal(m => ({ ...m, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && submitFolderModal()}
            />
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setFolderModal(null)}>Cancel</button>
              <button className={styles.modalConfirm} onClick={submitFolderModal}>
                {folderModal.mode === 'new' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Rename File Modal ════════════════════════════════ */}
      {renameModal && (
        <div className={styles.modalBackdrop} onClick={() => setRenameModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Rename File</h3>
            <input
              className={styles.modalInput}
              value={renameModal.name}
              autoFocus
              onChange={e => setRenameModal(m => ({ ...m, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleRenameFile()}
            />
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setRenameModal(null)}>Cancel</button>
              <button className={styles.modalConfirm} onClick={handleRenameFile}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Move File Modal ══════════════════════════════════ */}
      {moveModal && (
        <div className={styles.modalBackdrop} onClick={() => setMoveModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Move "{moveModal.file.name}"</h3>
            <div className={styles.folderPickerList}>
              <button
                className={`${styles.folderPickerItem} ${moveModal.folderId === '' ? styles.folderPickerActive : ''}`}
                onClick={() => setMoveModal(m => ({ ...m, folderId: '' }))}
              >
                <span>📂</span> Root (no folder)
              </button>
              {folders.map(f => (
                <button
                  key={f.id}
                  className={`${styles.folderPickerItem} ${moveModal.folderId === f.id ? styles.folderPickerActive : ''}`}
                  onClick={() => setMoveModal(m => ({ ...m, folderId: f.id }))}
                >
                  <span className={styles.folderDot} style={{ background: f.color || '#0A84FF' }} />
                  {f.name}
                </button>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setMoveModal(null)}>Cancel</button>
              <button className={styles.modalConfirm} onClick={handleMoveFile}>Move Here</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Delete Confirm Modal ══════════════════════════════ */}
      {deleteModal && (
        <div className={styles.modalBackdrop} onClick={() => setDeleteModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              Delete {deleteModal.type === 'file' ? 'File' : 'Folder'}?
            </h3>
            <p className={styles.modalBody}>
              {deleteModal.type === 'file'
                ? `"${deleteModal.item.name}" will be permanently deleted from your vault and cannot be recovered.`
                : `Folder "${deleteModal.item.name}" will be deleted. Files inside will be moved to the root.`}
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setDeleteModal(null)}>Cancel</button>
              <button
                className={styles.modalDelete}
                onClick={() =>
                  deleteModal.type === 'file'
                    ? handleDeleteFile(deleteModal.item)
                    : handleDeleteFolder(deleteModal.item)
                }
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
