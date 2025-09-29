import { Box, Button, Card, CardActions, CardContent, FormControlLabel, Slider, Stack, Switch, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

type Props = {
  camera: {
    id: string; name: string; location: string; detectionEnabled: boolean; fpsTarget: number; status: string;
  }
  onChanged: () => void
}

type AlertMsg = {
  type: 'alert'; cameraId: string; alertId: string; timestamp: string; snapshotUrl?: string
}

export function CameraTile({ camera, onChanged }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [detection, setDetection] = useState(camera.detectionEnabled)
  const [fps, setFps] = useState(camera.fpsTarget)
  const [alerts, setAlerts] = useState<AlertMsg[]>([])
  const token = localStorage.getItem('token')

  // WebSocket subscribe
  useEffect(() => {
    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}?token=${token}`)
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', cameraId: camera.id }))
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data))
        if (data.type === 'alert' && data.cameraId === camera.id) {
          setAlerts((a) => [data, ...a].slice(0, 5))
        }
      } catch {}
    }
    return () => ws.close()
  }, [camera.id])

  // Start stream
  async function start() {
    await fetch(`${import.meta.env.VITE_API_BASE}/api/cameras/${camera.id}/start`, { method: 'POST', headers: { authorization: `bearer ${token}` } })
    onChanged()
    // Use MSE/WebRTC helper page of MediaMTX (WHEP URL). In real app, use WHIP/WHEP JS or HLS fallback.
    // For demo we use the public WHEP endpoint via <video> srcObject unsupported; show info instead.
  }

  async function stop() {
    await fetch(`${import.meta.env.VITE_API_BASE}/api/cameras/${camera.id}/stop`, { method: 'POST', headers: { authorization: `bearer ${token}` } })
    onChanged()
  }

  async function onToggleDetection(val: boolean) {
    setDetection(val)
    await fetch(`${import.meta.env.VITE_API_BASE}/api/cameras/${camera.id}`, {
      method: 'PUT', headers: { 'content-type': 'application/json', authorization: `bearer ${token}` },
      body: JSON.stringify({ detectionEnabled: val })
    })
  }

  async function onFpsCommit(_: Event, val: number | number[]) {
    const v = Array.isArray(val) ? val[0] : val
    await fetch(`${import.meta.env.VITE_API_BASE}/api/cameras/${camera.id}`, {
      method: 'PUT', headers: { 'content-type': 'application/json', authorization: `bearer ${token}` },
      body: JSON.stringify({ fpsTarget: v })
    })
  }

  const streamInfo = `${import.meta.env.VITE_MEDIAMTX_WHEP}/cameras/${camera.id}`

  return (
    <Card sx={{ borderRadius: 3, overflow: 'hidden', background: 'sand' }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{camera.name}</Typography>
          <Box sx={{ aspectRatio: '16/9', background: '#000', borderRadius: 2 }} />
          <Typography variant="caption" color="text.secondary">WebRTC WHEP: {streamInfo}</Typography>
          <FormControlLabel control={<Switch checked={detection} onChange={(e) => onToggleDetection(e.target.checked)} />} label="Face Detection" />
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption">FPS</Typography>
            <Slider min={1} max={30} value={fps} onChange={(_, v) => setFps(v as number)} onChangeCommitted={onFpsCommit} sx={{ flex: 1 }} />
            <Typography variant="caption">{fps}</Typography>
          </Stack>
        </Stack>
      </CardContent>
      <CardActions>
        <Button onClick={start} variant="contained" size="small" sx={{ bgcolor: 'secondary.main' }}>Start</Button>
        <Button onClick={stop} variant="outlined" size="small">Stop</Button>
      </CardActions>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2">Recent alerts</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
          {alerts.map(a => (
            <Box key={a.alertId} sx={{ width: 72, height: 48, background: '#ccc', borderRadius: 1, overflow: 'hidden' }}>
              {a.snapshotUrl ? <img src={a.snapshotUrl} alt={`alert ${a.alertId}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
            </Box>
          ))}
        </Stack>
      </Box>
    </Card>
  )
}

