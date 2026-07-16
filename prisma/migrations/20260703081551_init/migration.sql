-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'markdown',
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resumeId" TEXT NOT NULL,
    "jobId" TEXT,
    "label" TEXT,
    "content" TEXT NOT NULL,
    "changesMade" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResumeVersion_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResumeVersion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SearchProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "location" TEXT,
    "remoteOnly" BOOLEAN NOT NULL DEFAULT false,
    "seniority" TEXT,
    "sources" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "description" TEXT NOT NULL,
    "postedAt" DATETIME,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedJson" TEXT,
    "parsedAt" DATETIME,
    "matchScore" INTEGER,
    "matchJson" TEXT,
    "scoredAt" DATETIME
);

-- CreateTable
CREATE TABLE "CoverLetter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoverLetter_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "appliedAt" DATETIME,
    "followUpAt" DATETIME,
    "reviewStatus" TEXT NOT NULL DEFAULT 'NONE',
    "resumeVersionId" TEXT,
    "coverLetterId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Application_coverLetterId_fkey" FOREIGN KEY ("coverLetterId") REFERENCES "CoverLetter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ResumeVersion_resumeId_idx" ON "ResumeVersion"("resumeId");

-- CreateIndex
CREATE INDEX "ResumeVersion_jobId_idx" ON "ResumeVersion"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_dedupeKey_key" ON "Job"("dedupeKey");

-- CreateIndex
CREATE INDEX "Job_matchScore_idx" ON "Job"("matchScore");

-- CreateIndex
CREATE INDEX "Job_discoveredAt_idx" ON "Job"("discoveredAt");

-- CreateIndex
CREATE INDEX "Job_source_idx" ON "Job"("source");

-- CreateIndex
CREATE INDEX "CoverLetter_jobId_idx" ON "CoverLetter"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_key" ON "Application"("jobId");

-- CreateIndex
CREATE INDEX "Application_stage_idx" ON "Application"("stage");

-- CreateIndex
CREATE INDEX "Application_reviewStatus_idx" ON "Application"("reviewStatus");
