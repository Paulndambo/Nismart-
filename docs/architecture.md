# Nissmart Finance App - Architecture Document

## System Overview

The Nissmart Finance App is a micro-savings and payout platform designed to handle financial transactions with high reliability and safety. The system enables users to:

- Create accounts and manage wallets
- Deposit funds (simulated)
- Transfer funds between users internally
- Withdraw funds (simulated)
- View transaction history and balances

The platform consists of a transaction engine that processes all financial operations atomically, a ledger system that maintains an immutable record of all transactions, and two dashboards: one for end-users and one for finance/operations teams to monitor system health and activity.

## Architecture Components

### API Service (Django REST Framework)

The backend is built using Django REST Framework, providing a RESTful API that handles all business logic. The API layer is responsible for:

- Request validation and sanitization
- Business rule enforcement
- Transaction orchestration
- Error handling and response formatting
- Authentication and authorization (basic implementation)

### Database (PostgreSQL/SQLite)

The database stores all persistent data including users, accounts, transactions, and transfer requests. We use Django's ORM for database abstraction, which provides:

- Automatic migration management
- Query optimization
- Transaction support
- Data integrity constraints

### Ledger / Transaction Tables

The ledger is implemented through the `Transaction` model, which records every financial operation. Each transaction includes:

- Unique transaction ID
- Transaction type (Deposit, Transfer, Withdrawal)
- Amount
- Source and destination accounts
- Status (Pending, Completed, Failed)
- Timestamp
- Idempotency key (to prevent duplicate processing)

The ledger is append-only, ensuring immutability and auditability.

### Dashboard Service

The dashboard service is integrated into the API through dedicated admin endpoints that aggregate data for operational monitoring. It provides:

- Real-time system statistics
- Transaction history with filtering
- Recent activity feed
- User and account metrics

### Background Processing (Optional)

For production systems, background processing would handle:
- Asynchronous withdrawal processing
- Notification sending
- Reconciliation jobs
- Report generation

In this prototype, these are handled synchronously for simplicity.

## Data Model

### Users Table
- `id`: Primary key
- `email`: Unique identifier
- `first_name`, `last_name`: User identification
- `created_at`, `updated_at`: Timestamps

**Rationale**: Simple user model focusing on essential identification. Email serves as the unique identifier for account lookup.

### Accounts/Wallets Table
- `id`: Primary key
- `user`: Foreign key to Users
- `balance`: Decimal field (non-negative)
- `currency`: Default to 'NGN' (Nigerian Naira)
- `created_at`, `updated_at`: Timestamps

**Rationale**: Each user has one account/wallet. Balance is stored as a decimal to maintain precision. The balance is updated atomically through transactions only.

### Transactions Table
- `id`: Primary key (UUID for uniqueness)
- `transaction_type`: Enum (DEPOSIT, TRANSFER, WITHDRAWAL)
- `amount`: Decimal field
- `source_account`: Foreign key (nullable for deposits)
- `destination_account`: Foreign key (nullable for withdrawals)
- `status`: Enum (PENDING, COMPLETED, FAILED)
- `idempotency_key`: Unique string (prevents duplicate processing)
- `metadata`: JSON field for additional data
- `created_at`, `updated_at`: Timestamps

**Rationale**: Single table for all transaction types simplifies querying and maintains consistency. The idempotency_key ensures that retries don't create duplicate transactions. Status tracking allows for proper error handling and reconciliation.

### TransferRequests Table
- `id`: Primary key
- `source_account`: Foreign key
- `destination_account`: Foreign key
- `amount`: Decimal field
- `status`: Enum (PENDING, COMPLETED, FAILED)
- `transaction`: Foreign key to Transactions (one-to-one)
- `created_at`, `updated_at`: Timestamps

**Rationale**: Separate table for transfer requests allows tracking of transfer-specific metadata and provides a clear audit trail for internal transfers.

### Withdrawals Table
- `id`: Primary key
- `account`: Foreign key
- `amount`: Decimal field
- `status`: Enum (PENDING, PROCESSING, COMPLETED, FAILED)
- `transaction`: Foreign key to Transactions
- `external_reference`: String (for external system integration)
- `created_at`, `updated_at`: Timestamps

**Rationale**: Separate withdrawals table allows tracking of withdrawal-specific statuses and external system references, which is important for reconciliation with external payment processors.

## Transaction Safety

### Avoiding Negative Balances

- **Database Constraints**: The `balance` field in the Account model has a check constraint ensuring it cannot be negative.
- **Application-Level Validation**: Before processing any debit operation (transfer or withdrawal), the system checks if the account has sufficient balance.
- **Atomic Operations**: All balance updates occur within database transactions, ensuring consistency.

### Avoiding Double-Spend

- **Idempotency Keys**: Every transaction request must include a unique idempotency key. The system checks for existing transactions with the same key before processing.
- **Database Transactions**: All operations that modify balances are wrapped in database transactions with appropriate isolation levels.
- **Locking**: Account rows are locked during balance updates using `select_for_update()` to prevent concurrent modifications.

### Ensuring Atomicity

- **Database Transactions**: Django's transaction.atomic() decorator ensures that all database operations in a request either complete entirely or roll back completely.
- **Two-Phase Updates**: For transfers, both source and destination account updates occur in a single transaction. If either fails, both are rolled back.

### Idempotency

- **Idempotency Key Validation**: Each transaction endpoint checks for existing transactions with the provided idempotency key.
- **Idempotent Responses**: If a transaction with the same idempotency key exists, the system returns the existing transaction details without creating a new one.
- **Key Generation**: Clients are responsible for generating unique idempotency keys (typically UUIDs).

### Validation

- **Input Validation**: All inputs are validated using Django REST Framework serializers, checking:
  - Required fields are present
  - Data types are correct
  - Amounts are positive
  - Accounts exist and are active
  - User has permission to access the account
- **Business Rule Validation**: Custom validators check:
  - Sufficient balance for debits
  - Accounts are different for transfers
  - Amounts meet minimum/maximum thresholds

## Error Handling

### Failed Transfers

- **Status Tracking**: Failed transfers are marked with status `FAILED` in the database.
- **Rollback**: If a transfer fails, any partial updates are rolled back automatically.
- **Error Response**: The API returns a clear error message indicating the reason for failure (insufficient balance, invalid account, etc.).
- **Logging**: All failures are logged with context for debugging and auditing.

### Failed Withdrawals

- **Status Progression**: Withdrawals go through states: PENDING → PROCESSING → COMPLETED/FAILED
- **Retry Mechanism**: Failed withdrawals can be retried (in production, this would be automated).
- **External System Simulation**: The system simulates external payment processor responses, including failures.
- **Balance Restoration**: If a withdrawal fails after balance deduction, the balance is restored (handled in the transaction rollback).

### Unexpected Backend Errors

- **Exception Handling**: All endpoints are wrapped in try-except blocks to catch unexpected errors.
- **Graceful Degradation**: The system returns appropriate HTTP status codes (500 for server errors, 400 for client errors).
- **Error Logging**: All exceptions are logged with stack traces for debugging.
- **Transaction Rollback**: Database transactions ensure that partial updates are never committed on errors.
- **User-Friendly Messages**: Generic error messages are returned to clients while detailed errors are logged server-side.

## Assumptions & Trade-offs

### Assumptions

1. **Single Currency**: The system assumes all transactions are in the same currency (NGN).
2. **One Account Per User**: Each user has a single account/wallet.
3. **Synchronous Processing**: All operations are processed synchronously (no background jobs).
4. **Simulated External Systems**: Deposits and withdrawals are simulated rather than integrated with real payment processors.
5. **Basic Authentication**: Authentication is simplified for the prototype (production would use JWT/OAuth).
6. **No Fee Structure**: The system does not charge transaction fees.

### Trade-offs

1. **Simplicity vs. Scalability**: The current design prioritizes clarity and correctness over high-throughput optimization. For production, we would need:
   - Caching layers (Redis)
   - Message queues for async processing
   - Database read replicas
   - Connection pooling

2. **SQLite vs. PostgreSQL**: The prototype uses SQLite for easy setup, but production requires PostgreSQL for:
   - Better concurrency handling
   - Advanced locking mechanisms
   - Better performance under load

3. **Synchronous vs. Asynchronous**: All operations are synchronous for simplicity. Production would benefit from:
   - Async withdrawal processing
   - Webhook notifications
   - Background reconciliation jobs

4. **Single Database vs. Event Sourcing**: We use a traditional relational database. Event sourcing would provide better auditability but adds complexity.

5. **No Rate Limiting**: The prototype doesn't include rate limiting, which would be essential in production to prevent abuse.

6. **Basic Logging**: Logging is to console/files. Production would require structured logging with aggregation (e.g., ELK stack).

## Conclusion

This architecture prioritizes correctness, safety, and auditability over performance optimizations. The design ensures that financial operations are processed reliably and that the system maintains data integrity even under error conditions. The modular structure allows for future enhancements while maintaining a clear separation of concerns.

