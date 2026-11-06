import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '@/icons'
import { ImportHelpModal } from './ImportHelpModal'

export function ExportImport({
  kind, onImport,
}: {
  kind: 'expenses' | 'incomes' | 'refs'
  onImport?: (format: 'xlsx' | 'csv') => void // Принимаем аргумент
}) {
  const [openExport, setOpenExport] = useState(false)
  const [openImport, setOpenImport] = useState(false)
  
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpMode, setHelpMode] = useState<'import' | 'export'>('import')
  
  const exportRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setOpenExport(false)
      if (importRef.current && !importRef.current.contains(e.target as Node)) setOpenImport(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const download = (fmt: 'xlsx' | 'csv') => {
    setOpenExport(false)
    window.open(`/api/export/${kind}.${fmt}`)
  }

  const showHelp = (mode: 'import' | 'export') => {
    setHelpMode(mode)
    setHelpOpen(true)
    setOpenExport(false)
    setOpenImport(false)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        
        {/* ================= КНОПКА ЭКСПОРТ ================= */}
        <div style={{ position: 'relative' }} ref={exportRef}>
          <button
            className="toolbar-btn"
            onClick={() => { setOpenExport((v) => !v); setOpenImport(false); }}
            aria-haspopup="menu"
            aria-expanded={openExport}
          >
            <Icon name="download" size={15} />
            <span>Экспорт</span>
            <span className={`toolbar-caret ${openExport ? 'open' : ''}`}>
              <Icon name="chevron" size={11} />
            </span>
          </button>

          {openExport && (
            <div className="export-dropdown" role="menu" style={{ right: 0, left: 'auto', minWidth: 220 }}>
              <button className="export-item" role="menuitem" onClick={() => download('xlsx')}>
                <span className="export-item-icon xlsx"><Icon name="download" size={14} /></span>
                <span className="export-item-body">
                  <span className="export-item-title">Excel</span>
                  <span className="export-item-sub">.xlsx</span>
                </span>
              </button>
              <button className="export-item" role="menuitem" onClick={() => download('csv')}>
                <span className="export-item-icon csv"><Icon name="download" size={14} /></span>
                <span className="export-item-body">
                  <span className="export-item-title">CSV</span>
                  <span className="export-item-sub">.csv (разделитель ;)</span>
                </span>
              </button>
              
              <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
              
              <button 
                className="export-item" 
                onClick={() => showHelp('export')}
                style={{ justifyContent: 'flex-start', background: 'transparent', padding: '8px 12px' }}
              >
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="help" size={12} />
                  Как работает экспорт?
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ================= КНОПКА ИМПОРТ ================= */}
        {onImport && (
          <div style={{ position: 'relative' }} ref={importRef}>
            <button 
              className="toolbar-btn" 
              onClick={() => { setOpenImport((v) => !v); setOpenExport(false); }}
              title="Загрузить файл"
            >
              <Icon name="upload" size={15} />
              <span>Импорт</span>
              <span className={`toolbar-caret ${openImport ? 'open' : ''}`}>
                <Icon name="chevron" size={11} />
              </span>
            </button>

            {openImport && (
              <div className="export-dropdown" role="menu" style={{ right: 0, left: 'auto', minWidth: 220 }}>
                
                {/* Пункт Excel */}
                <button 
                  className="export-item" 
                  role="menuitem" 
                  onClick={() => { setOpenImport(false); onImport('xlsx'); }}
                >
                  <span className="export-item-icon xlsx"><Icon name="upload" size={14} /></span>
                  <span className="export-item-body">
                    <span className="export-item-title">Excel</span>
                    <span className="export-item-sub">.xlsx</span>
                  </span>
                </button>

                {/* Пункт CSV */}
                <button 
                  className="export-item" 
                  role="menuitem" 
                  onClick={() => { setOpenImport(false); onImport('csv'); }}
                >
                  <span className="export-item-icon csv"><Icon name="upload" size={14} /></span>
                  <span className="export-item-body">
                    <span className="export-item-title">CSV</span>
                    <span className="export-item-sub">.csv (разделитель ;)</span>
                  </span>
                </button>

                <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />

                {/* Справка */}
                <button 
                  className="export-item" 
                  onClick={() => showHelp('import')}
                  style={{ justifyContent: 'flex-start', background: 'transparent', padding: '8px 12px' }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="help" size={12} />
                    Как правильно импортировать?
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ImportHelpModal 
        open={helpOpen} 
        onClose={() => setHelpOpen(false)} 
        kind={kind} 
        mode={helpMode} 
      />
    </>
  )
}