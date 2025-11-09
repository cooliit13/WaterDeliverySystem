import * as React from "react"
import { ToastProvider, ToastViewport } from "./toast"

const ToastContext = React.createContext({
  toast: () => {}
})

export function useToast() {
  return React.useContext(ToastContext)
}

export function Toaster({ children }) {
  const [toasts, setToasts] = React.useState([])

  function toast({ title, description, variant }) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, title, description, variant }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastProvider>
        {children}
        <ToastViewport />

        {toasts.map(t => (
          <div
            key={t.id}
            className="fixed bottom-4 right-4 bg-black text-white p-4 rounded shadow"
          >
            <strong>{t.title}</strong>
            {t.description && <p>{t.description}</p>}
          </div>
        ))}
      </ToastProvider>
    </ToastContext.Provider>
  )
}
