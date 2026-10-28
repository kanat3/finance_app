import React, { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal modal-${size}`}>
        {title && <h3>{title}</h3>}
        {children}
        {footer && <div className="actions">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmModal({
  open, title, message, okText = 'Удалить', onOk, onCancel,
}: {
  open: boolean; title: string; message: string; okText?: string
  onOk: () => void; onCancel: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={<>
        <button onClick={onCancel}>Отмена</button>
        <button className="danger" onClick={onOk}>{okText}</button>
      </>}
    >
      <p>{message}</p>
    </Modal>
  )
}

export function PromptModal({
  open, title, label, defaultValue = '', okText = 'Сохранить',
  onOk, onCancel,
}: {
  open: boolean; title: string; label: string; defaultValue?: string
  okText?: string; onOk: (v: string) => void; onCancel: () => void
}) {
  const [v, setV] = React.useState(defaultValue)
  useEffect(() => { if (open) setV(defaultValue) }, [open, defaultValue])
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={<>
        <button onClick={onCancel}>Отмена</button>
        <button className="primary" onClick={() => onOk(v.trim())} disabled={!v.trim()}>{okText}</button>
      </>}
    >
      <label>{label}</label>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) onOk(v.trim()) }}
        autoFocus
      />
    </Modal>
  )
}