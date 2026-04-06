package handlers

import (
	"context"
	"errors"
	"finance-backend/database"
	"finance-backend/models"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

func CreateSavingsGoal(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	req := new(models.SavingsGoalRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.GoalName = strings.TrimSpace(req.GoalName)
	req.Icon = strings.TrimSpace(req.Icon)
	if req.GoalName == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "goal name is required"})
	}
	if req.TargetAmount <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "target amount must be greater than 0"})
	}
	if req.Icon == "" {
		req.Icon = "💰"
	}

	var targetDate *time.Time
	if strings.TrimSpace(req.TargetDate) != "" {
		parsedDate, err := time.Parse("2006-01-02", req.TargetDate)
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "target date must be in YYYY-MM-DD format"})
		}
		targetDate = &parsedDate
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var goal models.SavingsGoal
	err := database.Pool.QueryRow(
		ctx,
		`INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, target_date, icon, status)
		 VALUES ($1, $2, $3, 0, $4, $5, 'active')
		 RETURNING goal_id, user_id, goal_name, target_amount, current_amount, target_date, icon, status, created_at`,
		userID,
		req.GoalName,
		req.TargetAmount,
		targetDate,
		req.Icon,
	).Scan(
		&goal.ID,
		&goal.UserID,
		&goal.GoalName,
		&goal.TargetAmount,
		&goal.CurrentAmount,
		&goal.TargetDate,
		&goal.Icon,
		&goal.Status,
		&goal.CreatedAt,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create savings goal"})
	}

	return c.Status(http.StatusCreated).JSON(fiber.Map{"goal": formatSavingsGoalStatus(goal)})
}

func UpdateSavingsGoal(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	goalID := c.Params("id")
	req := new(models.SavingsGoalRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.GoalName = strings.TrimSpace(req.GoalName)
	req.Icon = strings.TrimSpace(req.Icon)
	if req.GoalName == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "goal name is required"})
	}
	if req.TargetAmount <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "target amount must be greater than 0"})
	}
	if req.Icon == "" {
		req.Icon = "💰"
	}

	var targetDate *time.Time
	if strings.TrimSpace(req.TargetDate) != "" {
		parsedDate, err := time.Parse("2006-01-02", req.TargetDate)
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "target date must be in YYYY-MM-DD format"})
		}
		targetDate = &parsedDate
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var goal models.SavingsGoal
	err := database.Pool.QueryRow(
		ctx,
		`UPDATE savings_goals
		 SET goal_name = $1,
		     target_amount = $2,
		     target_date = $3,
		     icon = $4,
		     status = CASE WHEN current_amount >= $2 THEN 'completed' ELSE 'active' END
		 WHERE goal_id = $5 AND user_id = $6
		 RETURNING goal_id, user_id, goal_name, target_amount, current_amount, target_date, icon, status, created_at`,
		req.GoalName,
		req.TargetAmount,
		targetDate,
		req.Icon,
		goalID,
		userID,
	).Scan(
		&goal.ID,
		&goal.UserID,
		&goal.GoalName,
		&goal.TargetAmount,
		&goal.CurrentAmount,
		&goal.TargetDate,
		&goal.Icon,
		&goal.Status,
		&goal.CreatedAt,
	)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Savings goal not found"})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"goal": formatSavingsGoalStatus(goal)})
}

func DeleteSavingsGoal(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	goalID := c.Params("id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	commandTag, err := database.Pool.Exec(
		ctx,
		`DELETE FROM savings_goals WHERE goal_id = $1 AND user_id = $2`,
		goalID,
		userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete savings goal"})
	}
	if commandTag.RowsAffected() == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Savings goal not found"})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"message": "Savings goal deleted"})
}

func AddToSavingsGoal(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	goalID := c.Params("id")
	req := new(models.SavingsContributionRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Amount <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "amount must be greater than 0"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := database.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not start contribution update"})
	}
	defer tx.Rollback(ctx)

	var goal models.SavingsGoal
	err = tx.QueryRow(
		ctx,
		`UPDATE savings_goals
		 SET current_amount = current_amount + $1,
		     status = CASE WHEN current_amount + $1 >= target_amount THEN 'completed' ELSE 'active' END
		 WHERE goal_id = $2 AND user_id = $3
		 RETURNING goal_id, user_id, goal_name, target_amount, current_amount, target_date, icon, status, created_at`,
		req.Amount,
		goalID,
		userID,
	).Scan(
		&goal.ID,
		&goal.UserID,
		&goal.GoalName,
		&goal.TargetAmount,
		&goal.CurrentAmount,
		&goal.TargetDate,
		&goal.Icon,
		&goal.Status,
		&goal.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Savings goal not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not add contribution"})
	}

	if err := createSavingsContributionTransaction(ctx, tx, userID, goal, req.Amount); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not record savings contribution transaction"})
	}

	if err := tx.Commit(ctx); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not finalize contribution"})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"goal": formatSavingsGoalStatus(goal)})
}

func createSavingsContributionTransaction(
	ctx context.Context,
	tx pgx.Tx,
	userID uint,
	goal models.SavingsGoal,
	amount float64,
) error {
	description := "Contribution to " + goal.GoalName
	_, err := tx.Exec(
		ctx,
		`INSERT INTO transactions (user_id, title, category, transaction_type, amount, description, transaction_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		userID,
		"Savings Contribution",
		"Savings",
		"expense",
		amount,
		description,
		time.Now(),
	)
	return err
}

func GetSavingsGoals(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(
		ctx,
		`SELECT goal_id, user_id, goal_name, target_amount, current_amount, target_date, icon, status, created_at
		 FROM savings_goals
		 WHERE user_id = $1
		 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch savings goals"})
	}
	defer rows.Close()

	goals := make([]models.SavingsGoalStatus, 0)
	for rows.Next() {
		var goal models.SavingsGoal
		if err := rows.Scan(
			&goal.ID,
			&goal.UserID,
			&goal.GoalName,
			&goal.TargetAmount,
			&goal.CurrentAmount,
			&goal.TargetDate,
			&goal.Icon,
			&goal.Status,
			&goal.CreatedAt,
		); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not read savings goals"})
		}
		goals = append(goals, formatSavingsGoalStatus(goal))
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"goals": goals})
}

func formatSavingsGoalStatus(goal models.SavingsGoal) models.SavingsGoalStatus {
	status := models.SavingsGoalStatus{
		ID:            goal.ID,
		GoalName:      goal.GoalName,
		TargetAmount:  goal.TargetAmount,
		CurrentAmount: goal.CurrentAmount,
		Icon:          goal.Icon,
		Status:        goal.Status,
	}

	if goal.TargetAmount > 0 {
		status.ProgressPercent = (goal.CurrentAmount / goal.TargetAmount) * 100
		if status.ProgressPercent > 100 {
			status.ProgressPercent = 100
		}
	}

	if goal.TargetDate != nil {
		status.TargetDate = goal.TargetDate.Format("2006-01-02")
		now := time.Now()
		days := int(goal.TargetDate.Sub(now).Hours() / 24)
		if days < 0 {
			days = 0
		}
		status.DaysRemaining = days

		monthsRemaining := (goal.TargetDate.Year()-now.Year())*12 + int(goal.TargetDate.Month()-now.Month())
		if goal.TargetDate.Day() > now.Day() {
			monthsRemaining++
		}
		if monthsRemaining < 1 && days > 0 {
			monthsRemaining = 1
		}
		if monthsRemaining > 0 {
			remainingAmount := goal.TargetAmount - goal.CurrentAmount
			if remainingAmount < 0 {
				remainingAmount = 0
			}
			status.MonthlyRequirement = remainingAmount / float64(monthsRemaining)
		}
	}

	return status
}
