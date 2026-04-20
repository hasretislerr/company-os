package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresLeaveRequestRepository struct {
	db *sql.DB
}

func NewPostgresLeaveRequestRepository(db *sql.DB) *PostgresLeaveRequestRepository {
	return &PostgresLeaveRequestRepository{db: db}
}

func (r *PostgresLeaveRequestRepository) Create(ctx context.Context, req *domain.LeaveRequest) error {
	query := `
		INSERT INTO leave_requests (id, user_id, organization_id, type, start_date, end_date, status, reason, manager_status, hr_status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
	`
	_, err := r.db.ExecContext(ctx, query, req.ID, req.UserID, req.OrganizationID, req.Type, req.StartDate, req.EndDate, req.Status, req.Reason, req.ManagerStatus, req.HRStatus)
	return err
}

func (r *PostgresLeaveRequestRepository) GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*domain.LeaveRequest, error) {
	query := `
		SELECT id, user_id, organization_id, type, start_date, end_date, status, reason, rejection_reason, 
		       manager_status, manager_approved_by, manager_approved_at,
		       hr_status, hr_approved_by, hr_approved_at,
		       created_at, updated_at
		FROM leave_requests WHERE id = $1 AND organization_id = $2
	`
	req := &domain.LeaveRequest{}
	var rejectionReason sql.NullString
	var managerApprovedBy, hrApprovedBy sql.NullString
	var managerApprovedAt, hrApprovedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id, orgID).Scan(
		&req.ID, &req.UserID, &req.OrganizationID, &req.Type, &req.StartDate, &req.EndDate, &req.Status, &req.Reason, &rejectionReason,
		&req.ManagerStatus, &managerApprovedBy, &managerApprovedAt,
		&req.HRStatus, &hrApprovedBy, &hrApprovedAt,
		&req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if rejectionReason.Valid {
		req.RejectionReason = rejectionReason.String
	}
	if managerApprovedBy.Valid {
		id, _ := uuid.Parse(managerApprovedBy.String)
		req.ManagerApprovedBy = &id
	}
	if managerApprovedAt.Valid {
		req.ManagerApprovedAt = &managerApprovedAt.Time
	}
	if hrApprovedBy.Valid {
		id, _ := uuid.Parse(hrApprovedBy.String)
		req.HRApprovedBy = &id
	}
	if hrApprovedAt.Valid {
		req.HRApprovedAt = &hrApprovedAt.Time
	}

	return req, nil
}

func (r *PostgresLeaveRequestRepository) ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]*domain.LeaveRequest, error) {
	query := `
		SELECT 
			lr.id, lr.user_id, lr.organization_id, lr.type, lr.start_date, lr.end_date, lr.status, lr.reason, lr.rejection_reason,
			lr.manager_status, lr.manager_approved_by, lr.manager_approved_at,
			lr.hr_status, lr.hr_approved_by, lr.hr_approved_at,
			lr.created_at, lr.updated_at,
			u.first_name, u.last_name, u.email
		FROM leave_requests lr
		JOIN users u ON lr.user_id = u.id
		WHERE lr.organization_id = $1
		ORDER BY lr.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := make([]*domain.LeaveRequest, 0)
	for rows.Next() {
		req := &domain.LeaveRequest{
			User: &domain.User{},
		}
		var rejectionReason sql.NullString
		var managerApprovedBy, hrApprovedBy sql.NullString
		var managerApprovedAt, hrApprovedAt sql.NullTime

		err := rows.Scan(
			&req.ID, &req.UserID, &req.OrganizationID, &req.Type, &req.StartDate, &req.EndDate, &req.Status, &req.Reason, &rejectionReason,
			&req.ManagerStatus, &managerApprovedBy, &managerApprovedAt,
			&req.HRStatus, &hrApprovedBy, &hrApprovedAt,
			&req.CreatedAt, &req.UpdatedAt,
			&req.User.FirstName, &req.User.LastName, &req.User.Email,
		)
		if err != nil {
			return nil, err
		}

		if rejectionReason.Valid {
			req.RejectionReason = rejectionReason.String
		}
		if managerApprovedBy.Valid {
			id, _ := uuid.Parse(managerApprovedBy.String)
			req.ManagerApprovedBy = &id
		}
		if managerApprovedAt.Valid {
			req.ManagerApprovedAt = &managerApprovedAt.Time
		}
		if hrApprovedBy.Valid {
			id, _ := uuid.Parse(hrApprovedBy.String)
			req.HRApprovedBy = &id
		}
		if hrApprovedAt.Valid {
			req.HRApprovedAt = &hrApprovedAt.Time
		}

		req.User.ID = req.UserID
		requests = append(requests, req)
	}
	return requests, nil
}

func (r *PostgresLeaveRequestRepository) ListByUser(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) ([]*domain.LeaveRequest, error) {
	query := `
		SELECT id, user_id, organization_id, type, start_date, end_date, status, reason, rejection_reason,
		       manager_status, manager_approved_by, manager_approved_at,
		       hr_status, hr_approved_by, hr_approved_at,
		       created_at, updated_at
		FROM leave_requests
		WHERE user_id = $1 AND organization_id = $2
		ORDER BY created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := make([]*domain.LeaveRequest, 0)

	for rows.Next() {
		req := &domain.LeaveRequest{}
		var rejectionReason sql.NullString
		var managerApprovedBy, hrApprovedBy sql.NullString
		var managerApprovedAt, hrApprovedAt sql.NullTime

		err := rows.Scan(
			&req.ID, &req.UserID, &req.OrganizationID, &req.Type, &req.StartDate, &req.EndDate, &req.Status, &req.Reason, &rejectionReason,
			&req.ManagerStatus, &managerApprovedBy, &managerApprovedAt,
			&req.HRStatus, &hrApprovedBy, &hrApprovedAt,
			&req.CreatedAt, &req.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if rejectionReason.Valid {
			req.RejectionReason = rejectionReason.String
		}
		if managerApprovedBy.Valid {
			id, _ := uuid.Parse(managerApprovedBy.String)
			req.ManagerApprovedBy = &id
		}
		if managerApprovedAt.Valid {
			req.ManagerApprovedAt = &managerApprovedAt.Time
		}
		if hrApprovedBy.Valid {
			id, _ := uuid.Parse(hrApprovedBy.String)
			req.HRApprovedBy = &id
		}
		if hrApprovedAt.Valid {
			req.HRApprovedAt = &hrApprovedAt.Time
		}

		requests = append(requests, req)
	}
	return requests, nil
}

func (r *PostgresLeaveRequestRepository) UpdateStatus(ctx context.Context, id uuid.UUID, orgID uuid.UUID, status domain.LeaveRequestStatus, rejectionReason string) error {
	query := `
		UPDATE leave_requests 
		SET status = $1, rejection_reason = $2, updated_at = NOW()
		WHERE id = $3 AND organization_id = $4
	`
	var reasonParam sql.NullString
	if rejectionReason != "" {
		reasonParam.String = rejectionReason
		reasonParam.Valid = true
	}

	_, err := r.db.ExecContext(ctx, query, status, reasonParam, id, orgID)
	return err
}

// ListPendingForManager returns leave requests that need manager approval for a specific department
func (r *PostgresLeaveRequestRepository) ListPendingForManager(ctx context.Context, orgID uuid.UUID, department string) ([]*domain.LeaveRequest, error) {
	query := `
		SELECT 
			lr.id, lr.user_id, lr.organization_id, lr.type, lr.start_date, lr.end_date, lr.status, lr.reason, lr.rejection_reason,
			lr.manager_status, lr.manager_approved_by, lr.manager_approved_at,
			lr.hr_status, lr.hr_approved_by, lr.hr_approved_at,
			lr.created_at, lr.updated_at,
			u.first_name, u.last_name, u.email
		FROM leave_requests lr
		JOIN users u ON lr.user_id = u.id
		JOIN organization_members om ON lr.user_id = om.user_id AND lr.organization_id = om.organization_id
		WHERE lr.organization_id = $1 AND lr.manager_status = 'Pending' AND om.department = $2
		ORDER BY lr.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID, department)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanLeaveRequests(rows)
}

// ListPendingForHR returns leave requests that passed manager approval and need HR approval
func (r *PostgresLeaveRequestRepository) ListPendingForHR(ctx context.Context, orgID uuid.UUID) ([]*domain.LeaveRequest, error) {
	query := `
		SELECT 
			lr.id, lr.user_id, lr.organization_id, lr.type, lr.start_date, lr.end_date, lr.status, lr.reason, lr.rejection_reason,
			lr.manager_status, lr.manager_approved_by, lr.manager_approved_at,
			lr.hr_status, lr.hr_approved_by, lr.hr_approved_at,
			lr.created_at, lr.updated_at,
			u.first_name, u.last_name, u.email
		FROM leave_requests lr
		JOIN users u ON lr.user_id = u.id
		WHERE lr.organization_id = $1 AND lr.manager_status = 'Approved' AND lr.hr_status = 'Pending'
		ORDER BY lr.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanLeaveRequests(rows)
}

// UpdateManagerStatus updates the manager approval status
func (r *PostgresLeaveRequestRepository) UpdateManagerStatus(ctx context.Context, id uuid.UUID, orgID uuid.UUID, status domain.LeaveRequestStatus, approvedBy uuid.UUID, rejectionReason string) error {
	query := `
		UPDATE leave_requests 
		SET manager_status = $1, manager_approved_by = $2, manager_approved_at = $3, rejection_reason = $4, updated_at = NOW()
		WHERE id = $5 AND organization_id = $6
	`
	var reasonParam sql.NullString
	if rejectionReason != "" {
		reasonParam.String = rejectionReason
		reasonParam.Valid = true
	}

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, status, approvedBy, now, reasonParam, id, orgID)
	return err
}

// UpdateHRStatus updates the HR approval status and final status if approved
func (r *PostgresLeaveRequestRepository) UpdateHRStatus(ctx context.Context, id uuid.UUID, orgID uuid.UUID, status domain.LeaveRequestStatus, approvedBy uuid.UUID, rejectionReason string) error {
	query := `
		UPDATE leave_requests 
		SET hr_status = $1, hr_approved_by = $2, hr_approved_at = $3, rejection_reason = $4, 
		    status = CASE WHEN $1 = 'Approved' THEN 'Approved' ELSE status END,
		    updated_at = NOW()
		WHERE id = $5 AND organization_id = $6
	`
	var reasonParam sql.NullString
	if rejectionReason != "" {
		reasonParam.String = rejectionReason
		reasonParam.Valid = true
	}

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, status, approvedBy, now, reasonParam, id, orgID)
	return err
}

// Helper function to scan leave requests from rows
func (r *PostgresLeaveRequestRepository) scanLeaveRequests(rows *sql.Rows) ([]*domain.LeaveRequest, error) {
	requests := make([]*domain.LeaveRequest, 0)

	for rows.Next() {
		req := &domain.LeaveRequest{
			User: &domain.User{},
		}
		var rejectionReason sql.NullString
		var managerApprovedBy, hrApprovedBy sql.NullString
		var managerApprovedAt, hrApprovedAt sql.NullTime

		err := rows.Scan(
			&req.ID, &req.UserID, &req.OrganizationID, &req.Type, &req.StartDate, &req.EndDate, &req.Status, &req.Reason, &rejectionReason,
			&req.ManagerStatus, &managerApprovedBy, &managerApprovedAt,
			&req.HRStatus, &hrApprovedBy, &hrApprovedAt,
			&req.CreatedAt, &req.UpdatedAt,
			&req.User.FirstName, &req.User.LastName, &req.User.Email,
		)
		if err != nil {
			return nil, err
		}

		if rejectionReason.Valid {
			req.RejectionReason = rejectionReason.String
		}
		if managerApprovedBy.Valid {
			id, _ := uuid.Parse(managerApprovedBy.String)
			req.ManagerApprovedBy = &id
		}
		if managerApprovedAt.Valid {
			req.ManagerApprovedAt = &managerApprovedAt.Time
		}
		if hrApprovedBy.Valid {
			id, _ := uuid.Parse(hrApprovedBy.String)
			req.HRApprovedBy = &id
		}
		if hrApprovedAt.Valid {
			req.HRApprovedAt = &hrApprovedAt.Time
		}

		req.User.ID = req.UserID
		requests = append(requests, req)
	}
	return requests, nil
}
