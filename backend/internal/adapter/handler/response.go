package handler

import (
	"encoding/json"
	"net/http"
	"reflect"
)

// ErrorResponse represents a standardized JSON error response
type ErrorResponse struct {
	Error   bool   `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// RespondWithError sends a formatted JSON error response
func RespondWithError(w http.ResponseWriter, code int, message string) {
	RespondWithJSON(w, code, ErrorResponse{
		Error:   true,
		Message: message,
		Code:    code,
	})
}

// RespondWithJSON sends a generic JSON response
func RespondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	// If payload is a nil slice, convert it to an empty slice to ensure it encodes to [] instead of null
	if payload != nil {
		v := reflect.ValueOf(payload)
		if v.Kind() == reflect.Slice && v.IsNil() {
			payload = reflect.MakeSlice(v.Type(), 0, 0).Interface()
		}
	}

	response, err := json.Marshal(payload)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": true, "message": "Internal Server Error", "code": 500}`))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}
