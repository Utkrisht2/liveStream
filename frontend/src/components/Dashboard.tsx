import { AppBar, Box, Button, Container, Grid, IconButton, Toolbar, Typography } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { useEffect, useState } from 'react'
import { CameraTile } from './CameraTile'

type Camera = {
  id: string; name: string; rtspUrl: string; location: string; enabled: boolean; detectionEnabled: boolean; fpsTarget: number; status: string;
}

export function Dashboard() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const token = localStorage.getItem('token')

  async function fetchCameras() {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/cameras`, { headers: { authorization: `bearer ${token}` } })
    if (res.ok) {
      const data = await res.json()
      setCameras(data.items ?? [])
    }
  }

  useEffect(() => { fetchCameras() }, [])

  function logout() {
    localStorage.removeItem('token'); location.reload()
  }

  return (
    <Box>
      <AppBar position="sticky" color="transparent" sx={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'white' }}>RTSP Face Detection</Typography>
          <IconButton color="inherit" onClick={logout}><LogoutIcon /></IconButton>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>
        <Grid container spacing={2}>
          {cameras.map((c) => (
            <Grid key={c.id} item xs={12} sm={6} md={4} lg={3}>
              <CameraTile camera={c} onChanged={fetchCameras} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}

