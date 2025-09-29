import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { useMemo } from 'react'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'

function useTheme() {
  return useMemo(() => createTheme({
    palette: {
      primary: { main: '#0ABAB5' },
      secondary: { main: '#FF6B61' },
      background: { default: '#0F1724', paper: '#F6EFE8' },
      text: { primary: '#0F1724' },
      error: { main: '#FF6B61' },
      success: { main: '#0ABAB5' }
    },
    shape: { borderRadius: 12 },
    typography: { fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif' }
  }), [])
}

export default function App() {
  const theme = useTheme()
  const token = localStorage.getItem('token')
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {token ? <Dashboard /> : <Login />}
    </ThemeProvider>
  )
}

