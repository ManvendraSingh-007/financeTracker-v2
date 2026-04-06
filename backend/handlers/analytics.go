package handlers

import (
	"context"
	"finance-backend/database"
	"finance-backend/models"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v3"
	"golang.org/x/sync/errgroup"
)

func GetAnalyticsSummary(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var summary models.AnalyticsSummary
	categoryBreakdown := make([]models.AnalyticsCategoryBreakdown, 0)
	dailyCashflow := make([]models.AnalyticsDailyCashflow, 0)

	group, groupCtx := errgroup.WithContext(ctx)

	group.Go(func() error {
		return database.Pool.QueryRow(
			groupCtx,
			`SELECT
				COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
				COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
			 FROM transactions
			 WHERE user_id = $1
			   AND date_trunc('month', transaction_date) = date_trunc('month', CURRENT_DATE)`,
			userID,
		).Scan(&summary.TotalIncome, &summary.TotalExpense)
	})

	group.Go(func() error {
		rows, err := database.Pool.Query(
			groupCtx,
			`SELECT category, SUM(amount) AS value
			 FROM transactions
			 WHERE user_id = $1 AND transaction_type = 'expense'
			 GROUP BY category
			 ORDER BY value DESC`,
			userID,
		)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var item models.AnalyticsCategoryBreakdown
			if err := rows.Scan(&item.Category, &item.Value); err != nil {
				return err
			}
			categoryBreakdown = append(categoryBreakdown, item)
		}

		return rows.Err()
	})

	group.Go(func() error {
		rows, err := database.Pool.Query(
			groupCtx,
			`SELECT
				transaction_date,
				COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END), 0) AS daily_net
			 FROM transactions
			 WHERE user_id = $1
			   AND transaction_date > CURRENT_DATE - INTERVAL '30 days'
			 GROUP BY transaction_date
			 ORDER BY transaction_date`,
			userID,
		)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var date time.Time
			var item models.AnalyticsDailyCashflow
			if err := rows.Scan(&date, &item.DailyNet); err != nil {
				return err
			}
			item.Date = date.Format("2006-01-02")
			dailyCashflow = append(dailyCashflow, item)
		}

		return rows.Err()
	})

	if err := group.Wait(); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch analytics"})
	}

	summary.Balance = summary.TotalIncome - summary.TotalExpense
	if summary.TotalIncome > 0 {
		summary.BurnRate = (summary.TotalExpense / summary.TotalIncome) * 100
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"summary":            summary,
		"category_breakdown": categoryBreakdown,
		"daily_cashflow":     dailyCashflow,
	})
}
