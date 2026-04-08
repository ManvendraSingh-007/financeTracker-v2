package models

import "time"

type User struct {
	ID                 uint      `json:"user_id"`
	Username           string    `json:"username" validate:"required,min=3,max=50"`
	Email              string    `json:"email" validate:"required,email"`
	PasswordHash       string    `json:"-"`
	CurrencyPreference string    `json:"currency_preference"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type SignupRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Token           string `json:"token"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirmPassword"`
}

type Transaction struct {
	ID              uint      `json:"id"`
	UserID          uint      `json:"user_id"`
	Title           string    `json:"title"`
	Category        string    `json:"category"`
	TransactionType string    `json:"transaction_type"` // "income" or "expense"
	Amount          float64   `json:"amount"`
	Description     string    `json:"description"`
	TransactionDate time.Time `json:"transaction_date"`
	CreatedAt       time.Time `json:"created_at"`
}

type TransactionRequest struct {
	Title           string  `json:"title"`
	Category        string  `json:"category"`
	TransactionType string  `json:"transaction_type"`
	Amount          float64 `json:"amount"`
	Description     string  `json:"description"`
	TransactionDate string  `json:"transaction_date"`
}

type AnalyticsSummary struct {
	TotalIncome  float64 `json:"total_income"`
	TotalExpense float64 `json:"total_expense"`
	Balance      float64 `json:"balance"`
	BurnRate     float64 `json:"burn_rate"`
}

type AnalyticsCategoryBreakdown struct {
	Category string  `json:"category"`
	Value    float64 `json:"value"`
}

type AnalyticsDailyCashflow struct {
	Date     string  `json:"date"`
	DailyNet float64 `json:"daily_net"`
}

type Budget struct {
	ID          uint      `json:"budget_id"`
	UserID      uint      `json:"user_id"`
	Category    string    `json:"category"`
	AmountLimit float64   `json:"amount_limit"`
	Month       int       `json:"month"`
	Year        int       `json:"year"`
	CreatedAt   time.Time `json:"created_at"`
}

type BudgetRequest struct {
	Category    string  `json:"category"`
	AmountLimit float64 `json:"amount_limit"`
	Month       int     `json:"month"`
	Year        int     `json:"year"`
}

type BudgetStatus struct {
	ID           uint    `json:"budget_id"`
	Category     string  `json:"category"`
	AmountLimit  float64 `json:"amount_limit"`
	CurrentSpent float64 `json:"current_spent"`
	Remaining    float64 `json:"remaining"`
	OverBudget   bool    `json:"over_budget"`
	Month        int     `json:"month"`
	Year         int     `json:"year"`
}

type SavingsGoal struct {
	ID            uint       `json:"goal_id"`
	UserID        uint       `json:"user_id"`
	GoalName      string     `json:"goal_name"`
	TargetAmount  float64    `json:"target_amount"`
	CurrentAmount float64    `json:"current_amount"`
	TargetDate    *time.Time `json:"target_date"`
	Icon          string     `json:"icon"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
}

type SavingsGoalRequest struct {
	GoalName     string  `json:"goal_name"`
	TargetAmount float64 `json:"target_amount"`
	TargetDate   string  `json:"target_date"`
	Icon         string  `json:"icon"`
}

type SavingsContributionRequest struct {
	Amount float64 `json:"amount"`
}

type SavingsGoalStatus struct {
	ID                 uint    `json:"goal_id"`
	GoalName           string  `json:"goal_name"`
	TargetAmount       float64 `json:"target_amount"`
	CurrentAmount      float64 `json:"current_amount"`
	TargetDate         string  `json:"target_date"`
	Icon               string  `json:"icon"`
	Status             string  `json:"status"`
	ProgressPercent    float64 `json:"progress_percent"`
	DaysRemaining      int     `json:"days_remaining"`
	MonthlyRequirement float64 `json:"monthly_requirement"`
}

type DashboardOverviewSummary struct {
	TotalBalance    float64 `json:"total_balance"`
	MonthlySpending float64 `json:"monthly_spending"`
	SavingsCurrent  float64 `json:"savings_current"`
	SavingsTarget   float64 `json:"savings_target"`
	SavingsProgress float64 `json:"savings_progress"`
}

type DashboardOverviewCashflowPoint struct {
	Date    string  `json:"date"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

type DashboardOverviewTransaction struct {
	ID              uint    `json:"id"`
	Title           string  `json:"title"`
	Category        string  `json:"category"`
	TransactionType string  `json:"transaction_type"`
	Amount          float64 `json:"amount"`
	Description     string  `json:"description"`
	TransactionDate string  `json:"transaction_date"`
}

type DashboardOverviewInsight struct {
	Title   string `json:"title"`
	Message string `json:"message"`
}

type DashboardOverviewResponse struct {
	Summary            DashboardOverviewSummary         `json:"summary"`
	Cashflow           []DashboardOverviewCashflowPoint `json:"cashflow"`
	RecentTransactions []DashboardOverviewTransaction   `json:"recent_transactions"`
	TopGoals           []SavingsGoalStatus              `json:"top_goals"`
	Insights           []DashboardOverviewInsight       `json:"insights"`
	HasData            bool                             `json:"has_data"`
}

type ProfileUpdate struct {
	Username string `json:"username"`
}

type PasswordUpdate struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type PreferencesUpdate struct {
	Currency              string `json:"currency"`
	Theme                 string `json:"theme"`
	BudgetAlerts          bool   `json:"budgetAlerts"`
	GoalAlerts            bool   `json:"goalAlerts"`
	NotificationFrequency string `json:"notificationFrequency"`
}
