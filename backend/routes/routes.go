package routes

import (
	"finance-backend/handlers"
	"finance-backend/middleware"

	"github.com/gofiber/fiber/v3"
)

func Setup(app *fiber.App) {
	auth := app.Group("/auth")
	dashboard := app.Group("/dashboard", middleware.RequireAuth)
	transactions := app.Group("/transactions", middleware.RequireAuth)
	analytics := app.Group("/analytics", middleware.RequireAuth)
	budgets := app.Group("/budgets", middleware.RequireAuth)
	savings := app.Group("/savings", middleware.RequireAuth)

	// Auth routes
	auth.Post("/signup", handlers.Register)
	auth.Post("/login", handlers.Login)
	auth.Post("/logout", handlers.Logout)
	auth.Get("/me", middleware.RequireAuth, handlers.Me)

	dashboard.Get("/overview", handlers.GetDashboardOverview)

	transactions.Get("/", handlers.GetTransactions)
	transactions.Post("/", handlers.CreateTransaction)
	transactions.Put("/:id", handlers.UpdateTransaction)
	transactions.Delete("/:id", handlers.DeleteTransaction)

	analytics.Get("/summary", handlers.GetAnalyticsSummary)

	budgets.Get("/", handlers.GetBudgets)
	budgets.Post("/", handlers.CreateBudget)
	budgets.Put("/:id", handlers.UpdateBudget)
	budgets.Delete("/:id", handlers.DeleteBudget)

	savings.Get("/", handlers.GetSavingsGoals)
	savings.Post("/", handlers.CreateSavingsGoal)
	savings.Put("/:id", handlers.UpdateSavingsGoal)
	savings.Delete("/:id", handlers.DeleteSavingsGoal)
	savings.Patch("/:id/add", handlers.AddToSavingsGoal)
}
