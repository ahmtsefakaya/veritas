-- CreateTable
CREATE TABLE "evidence_reports" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "evidence_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_reports_status_createdAt_idx" ON "evidence_reports"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_reports_evidenceId_reporterId_key" ON "evidence_reports"("evidenceId", "reporterId");

-- AddForeignKey
ALTER TABLE "evidence_reports" ADD CONSTRAINT "evidence_reports_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_reports" ADD CONSTRAINT "evidence_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
