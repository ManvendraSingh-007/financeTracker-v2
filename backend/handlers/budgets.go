package handlers

import (
	"context"
	"finance-backend/database"
	"finance-backend/models"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

func CreateBudget(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	req := new(models.BudgetRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Category = strings.TrimSpace(req.Category)
	if req.Category == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "category is required"})
	}
	if req.AmountLimit <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "amount limit must be greater than 0"})
	}
	if req.Month < 1 || req.Month > 12 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "month must be between 1 and 12"})
	}
	if req.Year < 2000 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "year is invalid"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var budget models.Budget
	err := database.Pool.QueryRow(
		ctx,
		`INSERT INTO budgets (user_id, category, amount_limit, month, year)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (user_id, category, month, year)
		 DO UPDATE SET amount_limit = EXCLUDED.amount_limit
		 RETURNING budget_id, user_id, category, amount_limit, month, year, created_at`,
		userID,
		req.Category,
		req.AmountLimit,
		req.Month,
		req.Year,
	).Scan(
		&budget.ID,
		&budget.UserID,
		&budget.Category,
		&budget.AmountLimit,
		&budget.Month,
		&budget.Year,
		&budget.CreatedAt,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not save budget"})
	}

	return c.Status(http.StatusCreated).JSON(fiber.Map{"budget": budget})
}

func UpdateBudget(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")
	req := new(models.BudgetRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Category = strings.TrimSpace(req.Category)
	if req.Category == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "category is required"})
	}
	if req.AmountLimit <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "amount limit must be greater than 0"})
	}
	if req.Month < 1 || req.Month > 12 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "month must be between 1 and 12"})
	}
	if req.Year < 2000 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "year is invalid"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var budget models.Budget
	err := database.Pool.QueryRow(
		ctx,
		`UPDATE budgets
		 SET category = $1,
		     amount_limit = $2,
		     month = $3,
		     year = $4
		 WHERE budget_id = $5 AND user_id = $6
		 RETURNING budget_id, user_id, category, amount_limit, month, year, created_at`,
		req.Category,
		req.AmountLimit,
		req.Month,
		req.Year,
		id,
		userID,
	).Scan(
		&budget.ID,
		&budget.UserID,
		&budget.Category,
		&budget.AmountLimit,
		&budget.Month,
		&budget.Year,
		&budget.CreatedAt,
	)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Budget not found or already exists for that category/month"})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"budget": budget})
}

func DeleteBudget(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	commandTag, err := database.Pool.Exec(
		ctx,
		`DELETE FROM budgets WHERE budget_id = $1 AND user_id = $2`,
		id,
		userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete budget"})
	}
	if commandTag.RowsAffected() == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Budget not found"})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"message": "Budget deleted"})
}

func GetBudgets(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	now := time.Now()
	month := int(now.Month())
	year := now.Year()

	if rawMonth := strings.TrimSpace(c.Query("month")); rawMonth != "" {
		parsedMonth, err := strconv.Atoi(rawMonth)
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "month must be a number"})
		}
		month = parsedMonth
	}

	if rawYear := strings.TrimSpace(c.Query("year")); rawYear != "" {
		parsedYear, err := strconv.Atoi(rawYear)
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "year must be a number"})
		}
		year = parsedYear
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(
		ctx,
		`SELECT
			b.budget_id,
			b.category,
			b.amount_limit,
			COALESCE(SUM(t.amount), 0) AS current_spent,
			(b.amount_limit - COALESCE(SUM(t.amount), 0)) AS remaining,
			b.month,
			b.year
		FROM budgets b
		LEFT JOIN transactions t ON b.category = t.category
			AND b.user_id = t.user_id
			AND t.transaction_type = 'expense'
			AND EXTRACT(MONTH FROM t.transaction_date) = b.month
			AND EXTRACT(YEAR FROM t.transaction_date) = b.year
		WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
		GROUP BY b.budget_id, b.category, b.amount_limit, b.month, b.year
		ORDER BY b.category`,
		userID,
		month,
		year,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch budgets"})
	}
	defer rows.Close()

	budgets := make([]models.BudgetStatus, 0)
	for rows.Next() {
		var item models.BudgetStatus
		if err := rows.Scan(
			&item.ID,
			&item.Category,
			&item.AmountLimit,
			&item.CurrentSpent,
			&item.Remaining,
			&item.Month,
			&item.Year,
		); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not read budgets"})
		}
		item.OverBudget = item.CurrentSpent > item.AmountLimit
		budgets = append(budgets, item)
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"budgets": budgets})
}
