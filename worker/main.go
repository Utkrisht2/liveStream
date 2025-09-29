package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/exec"
    "path/filepath"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
)

type Pipeline struct {
    CameraID         string
    RtspURL          string
    FPSTarget        int
    DetectionEnabled bool
    Cmd              *exec.Cmd
}

var (
    pipelinesMu sync.Mutex
    pipelines   = map[string]*Pipeline{}
)

func main() {
    gin.SetMode(gin.ReleaseMode)
    r := gin.Default()
    r.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

    api := r.Group("/api")
    ctrl := api.Group("/control", internalAuth())
    ctrl.POST("/start", startHandler)
    ctrl.POST("/stop", stopHandler)
    ctrl.POST("/update", updateHandler)

    port := os.Getenv("WORKER_PORT")
    if port == "" { port = "8082" }
    log.Printf("worker listening on :%s", port)
    r.Run(":" + port)
}

func internalAuth() gin.HandlerFunc {
    key := os.Getenv("INTERNAL_API_KEY")
    return func(c *gin.Context) {
        if c.GetHeader("x-internal-key") != key || key == "" { c.AbortWithStatus(http.StatusForbidden); return }
        c.Next()
    }
}

type startReq struct {
    CameraID         string `json:"cameraId"`
    RtspURL          string `json:"rtspUrl"`
    FPSTarget        int    `json:"fpsTarget"`
    DetectionEnabled bool   `json:"detectionEnabled"`
}

func startHandler(c *gin.Context) {
    var req startReq
    if err := c.BindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "bad request"}); return }
    pipelinesMu.Lock(); defer pipelinesMu.Unlock()
    if p, ok := pipelines[req.CameraID]; ok && p.Cmd != nil { c.JSON(200, gin.H{"ok": true}); return }
    outName := fmt.Sprintf("camera-%s", req.CameraID)
    mediamtx := os.Getenv("MEDIAMTX_RTSP_URL")
    publishURL := fmt.Sprintf("%s/%s", mediamtx, outName)

    // For demo: use ffmpeg to restream the input to MediaMTX without processing
    // In full app, integrate gocv for detection and overlay
    cmd := exec.Command("ffmpeg", "-re", "-stream_loop", "-1", "-i", req.RtspURL, "-c:v", "copy", "-f", "rtsp", publishURL)
    if err := cmd.Start(); err != nil { c.JSON(500, gin.H{"error": err.Error()}); return }
    pipelines[req.CameraID] = &Pipeline{CameraID: req.CameraID, RtspURL: req.RtspURL, FPSTarget: req.FPSTarget, DetectionEnabled: req.DetectionEnabled, Cmd: cmd}
    go func(cam string, cc *exec.Cmd) {
        _ = cc.Wait()
        pipelinesMu.Lock(); delete(pipelines, cam); pipelinesMu.Unlock()
    }(req.CameraID, cmd)

    c.JSON(200, gin.H{"ok": true, "rtsp": publishURL})
}

type stopReq struct { CameraID string `json:"cameraId"` }

func stopHandler(c *gin.Context) {
    var req stopReq
    if err := c.BindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "bad request"}); return }
    pipelinesMu.Lock(); defer pipelinesMu.Unlock()
    if p, ok := pipelines[req.CameraID]; ok && p.Cmd != nil {
        _ = p.Cmd.Process.Kill()
        delete(pipelines, req.CameraID)
    }
    c.JSON(200, gin.H{"ok": true})
}

type updateReq struct {
    CameraID string `json:"cameraId"`
    Changes  map[string]any `json:"changes"`
}

func updateHandler(c *gin.Context) {
    var req updateReq
    if err := c.BindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "bad request"}); return }
    c.JSON(200, gin.H{"ok": true})
}

// demoAlert saves a snapshot and posts an alert to backend
func demoAlert(cameraID string) {
    backend := os.Getenv("BACKEND_URL")
    if backend == "" { backend = "http://backend:8080" }
    snapDir := filepath.Join("/app", "snapshots")
    os.MkdirAll(snapDir, 0o755)
    file := filepath.Join(snapDir, fmt.Sprintf("alert-%d.jpg", time.Now().UnixNano()))
    // For demo snapshot, create an empty file
    os.WriteFile(file, []byte{}, 0o644)
    snapURLBase := os.Getenv("SNAPSHOT_BASE_URL")
    snapURL := fmt.Sprintf("%s/%s", snapURLBase, filepath.Base(file))
    payload := map[string]any{
        "cameraId": cameraID,
        "timestamp": time.Now().UTC().Format(time.RFC3339),
        "bbox": []map[string]int{{"x":100, "y":60, "w":64, "h":64}},
        "confidence": 0.9,
        "snapshotUrl": snapURL,
    }
    b, _ := json.Marshal(payload)
    req, _ := http.NewRequest("POST", backend+"/api/alerts", bytesReader(b))
    req.Header.Set("content-type", "application/json")
    req.Header.Set("x-internal-key", os.Getenv("INTERNAL_API_KEY"))
    http.DefaultClient.Do(req)
}

func bytesReader(b []byte) *bytesReaderT { return &bytesReaderT{b: b} }

type bytesReaderT struct{ b []byte; i int }
func (r *bytesReaderT) Read(p []byte) (int, error) {
    if r.i >= len(r.b) { return 0, io.EOF }
    n := copy(p, r.b[r.i:])
    r.i += n
    return n, nil
}
func (r *bytesReaderT) Close() error { return nil }

