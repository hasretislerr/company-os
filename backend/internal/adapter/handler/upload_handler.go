package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

type UploadHandler struct {
	UploadDir string
}

func NewUploadHandler(uploadDir string) *UploadHandler {
	return &UploadHandler{UploadDir: uploadDir}
}

func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	// 20MB limit
	r.ParseMultipartForm(20 << 20)

	file, header, err := r.FormFile("file")
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Failed to get file")
		return
	}
	defer file.Close()

	// Ensure upload directory exists
	if _, err := os.Stat(h.UploadDir); os.IsNotExist(err) {
		os.MkdirAll(h.UploadDir, 0755)
	}

	// Generate safe filename
	ext := filepath.Ext(header.Filename)
	newFileName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), uuid.New().String()[:8], ext)
	dstPath := filepath.Join(h.UploadDir, newFileName)

	dst, err := os.Create(dstPath)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to save file")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to copy file")
		return
	}

	// Return URL
	fileUrl := fmt.Sprintf("/uploads/%s", newFileName)
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"url": "%s", "name": "%s", "type": "%s", "size": %d}`, fileUrl, header.Filename, header.Header.Get("Content-Type"), header.Size)
}
