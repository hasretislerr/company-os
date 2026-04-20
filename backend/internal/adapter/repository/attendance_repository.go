package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresAttendanceRepository struct {
	db *sql.DB
}

func NewPostgresAttendanceRepository(db *sql.DB) *PostgresAttendanceRepository {
	return &PostgresAttendanceRepository{db: db}
}

func (r *PostgresAttendanceRepository) Create(ctx context.Context, att *domain.Attendance) error {
	query := `
		INSERT INTO attendance (id, organization_id, user_id, check_in_at, check_out_at, status, source, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
	`
	_, err := r.db.ExecContext(ctx, query, att.ID, att.OrganizationID, att.UserID, att.CheckInAt, att.CheckOutAt, att.Status, att.Source)
	return err
}

func (r *PostgresAttendanceRepository) GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*domain.Attendance, error) {
	query := `
		SELECT id, organization_id, user_id, check_in_at, check_out_at, status, source, created_at, updated_at
		FROM attendance WHERE id = $1 AND organization_id = $2
	`
	att := &domain.Attendance{}
	err := r.db.QueryRowContext(ctx, query, id, orgID).Scan(
		&att.ID, &att.OrganizationID, &att.UserID, &att.CheckInAt, &att.CheckOutAt, &att.Status, &att.Source, &att.CreatedAt, &att.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return att, nil
}

func (r *PostgresAttendanceRepository) GetByUserAndDate(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, date time.Time) (*domain.Attendance, error) {
	query := `
		SELECT id, organization_id, user_id, check_in_at, check_out_at, status, source, created_at, updated_at
		FROM attendance 
		WHERE user_id = $1 AND organization_id = $2 AND (check_in_at::date = $3::date OR created_at::date = $3::date)
		LIMIT 1
	`
	att := &domain.Attendance{}
	err := r.db.QueryRowContext(ctx, query, userID, orgID, date).Scan(
		&att.ID, &att.OrganizationID, &att.UserID, &att.CheckInAt, &att.CheckOutAt, &att.Status, &att.Source, &att.CreatedAt, &att.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return att, nil
}

func (r *PostgresAttendanceRepository) ListByOrganization(ctx context.Context, orgID uuid.UUID, date time.Time) ([]*domain.Attendance, error) {
	query := `
		SELECT a.id, a.organization_id, a.user_id, a.check_in_at, a.check_out_at, a.status, a.source, a.created_at, a.updated_at,
		       u.first_name, u.last_name, u.email
		FROM attendance a
		JOIN users u ON a.user_id = u.id
		WHERE a.organization_id = $1 AND (a.check_in_at::date = $2::date OR a.created_at::date = $2::date)
		ORDER BY u.first_name ASC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID, date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]*domain.Attendance, 0)
	for rows.Next() {
		att := &domain.Attendance{User: &domain.User{}}
		err := rows.Scan(
			&att.ID, &att.OrganizationID, &att.UserID, &att.CheckInAt, &att.CheckOutAt, &att.Status, &att.Source, &att.CreatedAt, &att.UpdatedAt,
			&att.User.FirstName, &att.User.LastName, &att.User.Email,
		)
		if err != nil {
			return nil, err
		}
		att.User.ID = att.UserID
		results = append(results, att)
	}
	return results, nil
}

func (r *PostgresAttendanceRepository) Update(ctx context.Context, att *domain.Attendance, orgID uuid.UUID) error {
	query := `
		UPDATE attendance 
		SET check_in_at = $1, check_out_at = $2, status = $3, source = $4, updated_at = NOW()
		WHERE id = $5 AND organization_id = $6
	`
	_, err := r.db.ExecContext(ctx, query, att.CheckInAt, att.CheckOutAt, att.Status, att.Source, att.ID, orgID)
	return err
}

func (r *PostgresAttendanceRepository) CreateAuditLog(ctx context.Context, log *domain.AttendanceAuditLog) error {
	query := `
		INSERT INTO attendance_audit_logs (id, organization_id, attendance_id, changed_by, old_value, new_value, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`
	_, err := r.db.ExecContext(ctx, query, log.ID, log.OrganizationID, log.AttendanceID, log.ChangedBy, log.OldValue, log.NewValue, log.Reason)
	return err
}

func (r *PostgresAttendanceRepository) ListAuditLogs(ctx context.Context, attendanceID uuid.UUID, orgID uuid.UUID) ([]*domain.AttendanceAuditLog, error) {
	query := `
		SELECT l.id, l.organization_id, l.attendance_id, l.changed_by, l.old_value, l.new_value, l.reason, l.created_at,
		       u.first_name, u.last_name
		FROM attendance_audit_logs l
		JOIN users u ON l.changed_by = u.id
		WHERE l.attendance_id = $1 AND l.organization_id = $2
		ORDER BY l.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, attendanceID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := make([]*domain.AttendanceAuditLog, 0)
	for rows.Next() {
		l := &domain.AttendanceAuditLog{ChangedByUser: &domain.User{}}
		err := rows.Scan(
			&l.ID, &l.OrganizationID, &l.AttendanceID, &l.ChangedBy, &l.OldValue, &l.NewValue, &l.Reason, &l.CreatedAt,
			&l.ChangedByUser.FirstName, &l.ChangedByUser.LastName,
		)
		if err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, nil
}

func (r *PostgresAttendanceRepository) GetLeaveBalance(ctx context.Context, userID, orgID uuid.UUID, leaveType string) (*domain.UserLeaveBalance, error) {
	query := `
		SELECT id, organization_id, user_id, leave_type, balance_days, updated_at
		FROM user_leave_balances
		WHERE user_id = $1 AND organization_id = $2 AND leave_type = $3
	`
	balance := &domain.UserLeaveBalance{}
	err := r.db.QueryRowContext(ctx, query, userID, orgID, leaveType).Scan(
		&balance.ID, &balance.OrganizationID, &balance.UserID, &balance.LeaveType, &balance.BalanceDays, &balance.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return balance, err
}

func (r *PostgresAttendanceRepository) UpdateLeaveBalance(ctx context.Context, userID, orgID uuid.UUID, leaveType string, amount float64) error {
	query := `
		INSERT INTO user_leave_balances (id, organization_id, user_id, leave_type, balance_days, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (organization_id, user_id, leave_type)
		DO UPDATE SET balance_days = user_leave_balances.balance_days + $5, updated_at = NOW()
	`
	_, err := r.db.ExecContext(ctx, query, uuid.New(), orgID, userID, leaveType, amount)
	return err
}
