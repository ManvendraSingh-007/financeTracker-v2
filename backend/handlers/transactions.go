package handlers

import (
	"context"
	"finance-backend/database"
	"finance-backend/models"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

func GetTransactions(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(
		ctx,
		`SELECT transaction_id, user_id, title, category, transaction_type, amount, description, transaction_date, created_at
		 FROM transactions
		 WHERE user_id = $1
		 ORDER BY transaction_date DESC, transaction_id DESC`,
		userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch transactions"})
	}
	defer rows.Close()

	transactions := make([]models.Transaction, 0)
	for rows.Next() {
		var transaction models.Transaction
		if err := rows.Scan(
			&transaction.ID,
			&transaction.UserID,
			&transaction.Title,
			&transaction.Category,
			&transaction.TransactionType,
			&transaction.Amount,
			&transaction.Description,
			&transaction.TransactionDate,
			&transaction.CreatedAt,
		); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not read transactions"})
		}
		transactions = append(transactions, transaction)
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"transactions": transactions})
}

func CreateTransaction(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	req := new(models.TransactionRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	transactionDate, err := normalizeTransactionRequest(req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var transaction models.Transaction
	err = database.Pool.QueryRow(
		ctx,
		`INSERT INTO transactions (user_id, title, category, transaction_type, amount, description, transaction_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING transaction_id, user_id, title, category, transaction_type, amount, description, transaction_date, created_at`,
		userID,
		req.Title,
		req.Category,
		req.TransactionType,
		req.Amount,
		req.Description,
		transactionDate,
	).Scan(
		&transaction.ID,
		&transaction.UserID,
		&transaction.Title,
		&transaction.Category,
		&transaction.TransactionType,
		&transaction.Amount,
		&transaction.Description,
		&transaction.TransactionDate,
		&transaction.CreatedAt,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create transaction"})
	}

	return c.Status(http.StatusCreated).JSON(fiber.Map{"transaction": transaction})
}

func UpdateTransaction(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")
	req := new(models.TransactionRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	transactionDate, err := normalizeTransactionRequest(req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var transaction models.Transaction
	err = database.Pool.QueryRow(
		ctx,
		`UPDATE transactions
		 SET title = $1,
		     category = $2,
		     transaction_type = $3,
		     amount = $4,
		     description = $5,
		     transaction_date = $6
		 WHERE transaction_id = $7 AND user_id = $8
		 RETURNING transaction_id, user_id, title, category, transaction_type, amount, description, transaction_date, created_at`,
		req.Title,
		req.Category,
		req.TransactionType,
		req.Amount,
		req.Description,
		transactionDate,
		id,
		userID,
	).Scan(
		&transaction.ID,
		&transaction.UserID,
		&transaction.Title,
		&transaction.Category,
		&transaction.TransactionType,
		&transaction.Amount,
		&transaction.Description,
		&transaction.TransactionDate,
		&transaction.CreatedAt,
	)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Transaction not found"})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"transaction": transaction})
}

func DeleteTransaction(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	commandTag, err := database.Pool.Exec(
		ctx,
		`DELETE FROM transactions WHERE transaction_id = $1 AND user_id = $2`,
		id,
		userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete transaction"})
	}
	if commandTag.RowsAffected() == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Transaction not found"})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"message": "Transaction deleted"})
}

func normalizeTransactionRequest(req *models.TransactionRequest) (time.Time, error) {
	req.Title = strings.TrimSpace(req.Title)
	req.Category = strings.TrimSpace(req.Category)
	req.Description = strings.TrimSpace(req.Description)
	req.TransactionType = strings.TrimSpace(strings.ToLower(req.TransactionType))

	if req.Title == "" || req.Category == "" || req.TransactionDate == "" {
		return time.Time{}, fiber.NewError(http.StatusBadRequest, "title, category, and transaction date are required")
	}
	if req.Amount <= 0 {
		return time.Time{}, fiber.NewError(http.StatusBadRequest, "amount must be greater than 0")
	}
	if req.TransactionType != "income" && req.TransactionType != "expense" {
		return time.Time{}, fiber.NewError(http.StatusBadRequest, "transaction type must be income or expense")
	}

	transactionDate, err := time.Parse("2006-01-02", req.TransactionDate)
	if err != nil {
		return time.Time{}, fiber.NewError(http.StatusBadRequest, "transaction date must be in YYYY-MM-DD format")
	}

	return transactionDate, nil
}
