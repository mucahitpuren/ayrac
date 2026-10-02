import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

function Boot() {
  return <h1>Ayraç</h1>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
)
