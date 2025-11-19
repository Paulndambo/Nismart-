# Flow Diagrams

This document describes the three critical flows in the Nissmart Finance App. These diagrams illustrate the step-by-step process for deposit, transfer, and withdrawal operations, highlighting the safety mechanisms and transaction boundaries.

## Deposit Flow (Simulated Success)

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ POST /api/deposit/
     │ { account_id, amount, idempotency_key }
     ▼
┌─────────────────┐
│   API Service   │
└────┬────────────┘
     │
     │ 1. Validate idempotency_key
     │    - Check if transaction exists
     │    - If exists, return existing transaction
     │
     │ 2. Start Database Transaction
     │
     ▼
┌─────────────────┐
│  Database Lock  │
│  (select_for_   │
│   update)       │
└────┬────────────┘
     │
     │ 3. Lock Account Row
     │
     ▼
┌─────────────────┐
│ Create Transaction Record │
│ - type: DEPOSIT │
│ - status: COMPLETED │
│ - idempotency_key │
└────┬────────────┘
     │
     │ 4. Update Account Balance
     │    account.balance += amount
     │
     ▼
┌─────────────────┐
│ Commit Transaction │
└────┬────────────┘
     │
     │ 5. Return Transaction Data
     │
     ▼
┌─────────┐
│  User   │
│ (Success Response) │
└─────────┘
```

**Key Points:**
- Idempotency check happens first (prevents duplicate processing)
- Database transaction ensures atomicity
- Account row is locked to prevent concurrent modifications
- Balance update and transaction record creation happen atomically

## Internal Transfer Flow

```
┌─────────┐
│ User A  │
└────┬────┘
     │
     │ POST /api/transfer/
     │ { source_account_id, destination_account_id, amount, idempotency_key }
     ▼
┌─────────────────┐
│   API Service   │
└────┬────────────┘
     │
     │ 1. Validate idempotency_key
     │
     │ 2. Validate accounts are different
     │
     │ 3. Start Database Transaction
     │
     ▼
┌─────────────────┐
│  Database Lock  │
│  (select_for_   │
│   update)       │
└────┬────────────┘
     │
     │ 4. Lock Both Account Rows
     │    - Source Account
     │    - Destination Account
     │
     ▼
┌─────────────────┐
│ Validation      │
│ - Check source  │
│   balance >=    │
│   amount        │
└────┬────────────┘
     │
     │ 5. If insufficient balance:
     │    - Rollback transaction
     │    - Return error
     │
     │ 6. If sufficient balance:
     │
     ▼
┌─────────────────┐
│ Create Transaction Record │
│ - type: TRANSFER │
│ - status: COMPLETED │
│ - source_account │
│ - destination_account │
└────┬────────────┘
     │
     │ 7. Update Source Account
     │    source.balance -= amount
     │
     │ 8. Update Destination Account
     │    destination.balance += amount
     │
     │ 9. Create TransferRequest Record
     │
     ▼
┌─────────────────┐
│ Commit Transaction │
└────┬────────────┘
     │
     │ 10. Return Transaction Data
     │
     ▼
┌─────────┐
│ User A  │
│ (Success Response) │
└─────────┘
```

**Key Points:**
- Both accounts are locked simultaneously to prevent deadlocks
- Balance check happens after locking to ensure accuracy
- Both balance updates happen in a single transaction (atomicity)
- If any step fails, entire transaction rolls back

## Withdrawal Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ POST /api/withdraw/
     │ { account_id, amount, idempotency_key }
     ▼
┌─────────────────┐
│   API Service   │
└────┬────────────┘
     │
     │ 1. Validate idempotency_key
     │
     │ 2. Start Database Transaction
     │
     ▼
┌─────────────────┐
│  Database Lock  │
│  (select_for_   │
│   update)       │
└────┬────────────┘
     │
     │ 3. Lock Account Row
     │
     ▼
┌─────────────────┐
│ Validation      │
│ - Check balance │
│   >= amount     │
└────┬────────────┘
     │
     │ 4. If insufficient balance:
     │    - Rollback transaction
     │    - Return error
     │
     │ 5. If sufficient balance:
     │
     ▼
┌─────────────────┐
│ Simulate External System │
│ (90% success rate) │
└────┬────────────┘
     │
     │ 6. Simulate External Payment Processor
     │
     ├─── Success Path (90%) ───┐
     │                          │
     ▼                          ▼
┌─────────────────┐    ┌─────────────────┐
│ Create Transaction │  │ Create Transaction │
│ - type: WITHDRAWAL │  │ - type: WITHDRAWAL │
│ - status: COMPLETED │  │ - status: FAILED │
└────┬────────────┘    └────┬────────────┘
     │                      │
     │ 7. Update Balance    │ 7. No Balance Update
     │    account.balance   │    (transaction failed)
     │    -= amount         │
     │                      │
     │ 8. Create Withdrawal │ 8. Create Withdrawal
     │    Record            │    Record (FAILED)
     │    - status: COMPLETED │    - status: FAILED
     │    - external_ref    │    - no external_ref
     │                      │
     ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ Commit Transaction │  │ Commit Transaction │
└────┬────────────┘    └────┬────────────┘
     │                      │
     │ 9. Return Success    │ 9. Return Error
     │                      │    + Transaction Data
     │                      │
     ▼                      ▼
┌─────────┐            ┌─────────┐
│  User   │            │  User   │
│ (Success) │          │ (Failed) │
└─────────┘            └─────────┘
```

**Key Points:**
- Balance is checked before external system call
- External system simulation (90% success rate) determines outcome
- If external system fails, transaction is marked as FAILED but no balance is deducted
- If external system succeeds, balance is deducted and withdrawal is marked as COMPLETED
- All operations are within a database transaction for atomicity

## Idempotency Implementation

All three flows implement idempotency using the `idempotency_key`:

1. **Check First**: Before processing, check if a transaction with the same `idempotency_key` exists
2. **Return Existing**: If found, return the existing transaction without creating a new one
3. **Process New**: If not found, process the request and store the `idempotency_key` with the transaction

This ensures that:
- Retries don't create duplicate transactions
- Network failures can be safely retried
- Clients can safely resend requests

## Database Transaction Boundaries

All financial operations use Django's `transaction.atomic()` decorator/context manager:

- **Deposit**: Single transaction wrapping account lock, transaction creation, and balance update
- **Transfer**: Single transaction wrapping both account locks, validation, transaction creation, and both balance updates
- **Withdrawal**: Single transaction wrapping account lock, validation, external system simulation, transaction creation, and balance update (if successful)

This ensures that:
- All or nothing: Either all operations succeed or all are rolled back
- No partial updates: Balance and transaction records are always consistent
- Isolation: Concurrent requests are properly serialized through row-level locking

