import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/tokens.css'

// /admin is the address people type; the dashboard lives at #admin, like every other page of the site.
if (location.pathname === '/admin' || location.pathname === '/admin/') history.replaceState(null, '', '/#admin')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
