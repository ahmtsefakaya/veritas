-- CreateTable
CREATE TABLE "evidence_votes" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_votes_evidenceId_idx" ON "evidence_votes"("evidenceId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_votes_evidenceId_userId_key" ON "evidence_votes"("evidenceId", "userId");

-- AddForeignKey
ALTER TABLE "evidence_votes" ADD CONSTRAINT "evidence_votes_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_votes" ADD CONSTRAINT "evidence_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
