-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateIndex
CREATE INDEX "evidences_sideId_score_idx" ON "evidences"("sideId", "score");

-- CreateIndex
CREATE INDEX "evidences_authorId_idx" ON "evidences"("authorId");

-- CreateIndex
CREATE INDEX "sides_label_idx" ON "sides" USING GIN ("label" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "topics_status_createdAt_idx" ON "topics"("status", "createdAt");

-- CreateIndex
CREATE INDEX "topics_status_updatedAt_idx" ON "topics"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "topics_category_idx" ON "topics" USING GIN ("category" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "topics_title_idx" ON "topics" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "topics_description_idx" ON "topics" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "topics_creatorId_idx" ON "topics"("creatorId");
