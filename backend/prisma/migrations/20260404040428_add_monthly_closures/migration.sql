-- CreateTable
CREATE TABLE "MonthlyClosure" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalIncomes" REAL NOT NULL,
    "totalExpenses" REAL NOT NULL,
    "balance" REAL NOT NULL,
    "totalTransactions" INTEGER NOT NULL,
    "closedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "MonthlyClosure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyClosure_userId_month_year_key" ON "MonthlyClosure"("userId", "month", "year");
