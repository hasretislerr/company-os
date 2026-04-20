package handler

import (
	"log"
	"net/http"

	"github.com/hasret/company-os/backend/internal/adapter/search"
)

type SearchHandler struct {
	searcher *search.Searcher
}

func NewSearchHandler(searcher *search.Searcher) *SearchHandler {
	return &SearchHandler{
		searcher: searcher,
	}
}

// Search endpoint'i HTTP GET /api/search?q=... isteklerini karşılayıp ES üzerinde arama yapar.
func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	// Query string'den arama parametresini al
	query := r.URL.Query().Get("q")

	if query == "" {
		RespondWithError(w, http.StatusBadRequest, "Arama sorgusu boş olamaz")
		return
	}

	// Elasticsearch devre dışıysa
	if h.searcher == nil {
		RespondWithError(w, http.StatusServiceUnavailable, "Arama servisi şu anda aktif değil")
		return
	}

	orgID, _ := GetOrgID(r.Context())

	results, err := h.searcher.GlobalSearch(r.Context(), query, orgID)
	if err != nil {
		log.Printf("❌ Arama hatası: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Arama işlemi sırasında bir sorun oluştu")
		return
	}

	// JSON olarak yanıt dön
	RespondWithJSON(w, http.StatusOK, results)
}
