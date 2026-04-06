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
	"golang.org/x/sync/errgroup"
)

func GetDashboardOverview(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var response models.DashboardOverviewResponse
	var foodThisWeek float64
	var foodLastWeek float64

	group, groupCtx := errgroup.WithContext(ctx)

	group.Go(func() error {
		return database.Pool.QueryRow(
			groupCtx,
			`SELECT
				COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END), 0) AS total_balance,
				COALESCE(SUM(CASE WHEN transaction_type = 'expense'
					AND date_trunc('month', transaction_date) = date_trunc('month', CURRENT_DATE)
					THEN amount ELSE 0 END), 0) AS monthly_spending
			 FROM transactions
			 WHERE user_id = $1`,
			userID,
		).Scan(&response.Summary.TotalBalance, &response.Summary.MonthlySpending)
	})

	group.Go(func() error {
		return database.Pool.QueryRow(
			groupCtx,
			`SELECT
				COALESCE(SUM(current_amount), 0) AS savings_current,
				COALESCE(SUM(target_amount), 0) AS savings_target
			 FROM savings_goals
			 WHERE user_id = $1 AND status IN ('active', 'completed')`,
			userID,
		).Scan(&response.Summary.SavingsCurrent, &response.Summary.SavingsTarget)
	})

	group.Go(func() error {
		rows, err := database.Pool.Query(
			groupCtx,
			`SELECT
				transaction_date::date,
				COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) AS income,
				COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) AS expense
			 FROM transactions
			 WHERE user_id = $1
			   AND transaction_date >= CURRENT_DATE - INTERVAL '6 days'
			 GROUP BY transaction_date::date
			 ORDER BY transaction_date::date`,
			userID,
		)
		if err != nil {
			return err
		}
		defer rows.Close()

		points := make([]models.DashboardOverviewCashflowPoint, 0)
		for rows.Next() {
			var date time.Time
			var point models.DashboardOverviewCashflowPoint
			if err := rows.Scan(&date, &point.Income, &point.Expense); err != nil {
				return err
			}
			point.Date = date.Format("02 Jan")
			points = append(points, point)
		}
		if err := rows.Err(); err != nil {
			return err
		}

		response.Cashflow = fillOverviewCashflow(points)
		return nil
	})

	group.Go(func() error {
		rows, err := database.Pool.Query(
			groupCtx,
			`SELECT transaction_id, title, category, transaction_type, amount, description, transaction_date
			 FROM transactions
			 WHERE user_id = $1
			 ORDER BY transaction_date DESC, transaction_id DESC
			 LIMIT 5`,
			userID,
		)
		if err != nil {
			return err
		}
		defer rows.Close()

		items := make([]models.DashboardOverviewTransaction, 0)
		for rows.Next() {
			var item models.DashboardOverviewTransaction
			var date time.Time
			if err := rows.Scan(
				&item.ID,
				&item.Title,
				&item.Category,
				&item.TransactionType,
				&item.Amount,
				&item.Description,
				&date,
			); err != nil {
				return err
			}
			item.TransactionDate = date.Format("2006-01-02")
			items = append(items, item)
		}

		response.RecentTransactions = items
		return rows.Err()
	})

	group.Go(func() error {
		rows, err := database.Pool.Query(
			groupCtx,
			`SELECT goal_id, goal_name, target_amount, current_amount, target_date, icon, status, created_at
			 FROM savings_goals
			 WHERE user_id = $1
			 ORDER BY
			 	CASE WHEN status = 'active' THEN 0 ELSE 1 END,
			 	(target_amount - current_amount) DESC,
			 	created_at DESC
			 LIMIT 3`,
			userID,
		)
		if err != nil {
			return err
		}
		defer rows.Close()

		goals := make([]models.SavingsGoalStatus, 0)
		for rows.Next() {
			var goal models.SavingsGoal
			if err := rows.Scan(
				&goal.ID,
				&goal.GoalName,
				&goal.TargetAmount,
				&goal.CurrentAmount,
				&goal.TargetDate,
				&goal.Icon,
				&goal.Status,
				&goal.CreatedAt,
			); err != nil {
				return err
			}
			goals = append(goals, formatSavingsGoalStatus(goal))
		}

		response.TopGoals = goals
		return rows.Err()
	})

	group.Go(func() error {
		return database.Pool.QueryRow(
			groupCtx,
			`SELECT
				COALESCE(SUM(CASE
					WHEN transaction_type = 'expense'
					 AND category ILIKE '%food%'
					 AND transaction_date >= CURRENT_DATE - INTERVAL '6 days'
					THEN amount ELSE 0 END), 0) AS food_this_week,
				COALESCE(SUM(CASE
					WHEN transaction_type = 'expense'
					 AND category ILIKE '%food%'
					 AND transaction_date >= CURRENT_DATE - INTERVAL '13 days'
					 AND transaction_date < CURRENT_DATE - INTERVAL '6 days'
					THEN amount ELSE 0 END), 0) AS food_last_week
			 FROM transactions
			 WHERE user_id = $1`,
			userID,
		).Scan(&foodThisWeek, &foodLastWeek)
	})

	if err := group.Wait(); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch dashboard overview"})
	}

	if response.Summary.SavingsTarget > 0 {
		response.Summary.SavingsProgress = (response.Summary.SavingsCurrent / response.Summary.SavingsTarget) * 100
		if response.Summary.SavingsProgress > 100 {
			response.Summary.SavingsProgress = 100
		}
	}

	response.Insights = buildDashboardInsights(foodThisWeek, foodLastWeek, response.TopGoals)
	response.HasData = response.Summary.TotalBalance != 0 ||
		response.Summary.MonthlySpending != 0 ||
		len(response.RecentTransactions) > 0 ||
		len(response.TopGoals) > 0

	return c.Status(http.StatusOK).JSON(response)
}

func fillOverviewCashflow(points []models.DashboardOverviewCashflowPoint) []models.DashboardOverviewCashflowPoint {
	pointMap := make(map[string]models.DashboardOverviewCashflowPoint, len(points))
	for _, point := range points {
		pointMap[point.Date] = point
	}

	filled := make([]models.DashboardOverviewCashflowPoint, 0, 7)
	start := time.Now().AddDate(0, 0, -6)
	for i := 0; i < 7; i++ {
		day := start.AddDate(0, 0, i)
		key := day.Format("02 Jan")
		if point, ok := pointMap[key]; ok {
			filled = append(filled, point)
			continue
		}
		filled = append(filled, models.DashboardOverviewCashflowPoint{Date: key})
	}

	return filled
}

func buildDashboardInsights(
	foodThisWeek float64,
	foodLastWeek float64,
	topGoals []models.SavingsGoalStatus,
) []models.DashboardOverviewInsight {
	insights := make([]models.DashboardOverviewInsight, 0, 2)

	if foodThisWeek > 0 {
		if foodLastWeek > 0 {
			change := ((foodThisWeek - foodLastWeek) / foodLastWeek) * 100
			title := "Weekly food trend"
			if change > 0 {
				insights = append(insights, models.DashboardOverviewInsight{
					Title:   title,
					Message: "Food spending is " + formatSignedPercent(change) + " versus last week.",
				})
			} else {
				insights = append(insights, models.DashboardOverviewInsight{
					Title:   title,
					Message: "Food spending is down " + strings.TrimPrefix(formatSignedPercent(change), "-") + " versus last week.",
				})
			}
		} else {
			insights = append(insights, models.DashboardOverviewInsight{
				Title:   "Weekly food trend",
				Message: "Food spending started this week, with no spend recorded in the prior week.",
			})
		}
	}

	for _, goal := range topGoals {
		if goal.Status != "active" || goal.MonthlyRequirement <= 0 {
			continue
		}
		insights = append(insights, models.DashboardOverviewInsight{
			Title:   "Savings goal pace",
			Message: "You need about Rs " + formatWhole(goal.MonthlyRequirement) + " per month to reach " + goal.GoalName + ".",
		})
		break
	}

	if len(insights) == 0 {
		insights = append(insights, models.DashboardOverviewInsight{
			Title:   "Start your pulse",
			Message: "Add a transaction or savings goal to unlock personalized insights here.",
		})
	}

	return insights
}

func formatSignedPercent(value float64) string {
	sign := ""
	if value > 0 {
		sign = "+"
	}
	return sign + formatWhole(value) + "%"
}

func formatWhole(value float64) string {
	return strconv.FormatFloat(value, 'f', 0, 64)
}
