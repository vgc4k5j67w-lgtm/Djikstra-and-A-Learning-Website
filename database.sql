CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
    "ProductVersion" TEXT NOT NULL
);

BEGIN TRANSACTION;
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260206141134_InitialCreate', '10.0.2');

COMMIT;

BEGIN TRANSACTION;
CREATE TABLE "Quizzes" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Quizzes" PRIMARY KEY AUTOINCREMENT,
    "Title" TEXT NOT NULL,
    "Description" TEXT NULL,
);

CREATE TABLE "Questions" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Questions" PRIMARY KEY AUTOINCREMENT,
    "QuizId" INTEGER NOT NULL,
    "Type" INTEGER NOT NULL,
    "Text" TEXT NOT NULL,
    "Points" INTEGER NOT NULL,
    "Order" INTEGER NOT NULL,
    CONSTRAINT "FK_Questions_Quizzes_QuizId" FOREIGN KEY ("QuizId") REFERENCES "Quizzes" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Choices" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Choices" PRIMARY KEY AUTOINCREMENT,
    "QuestionId" INTEGER NOT NULL,
    "Text" TEXT NOT NULL,
    "IsCorrect" INTEGER NOT NULL,
    "Explanation" TEXT NULL,
    CONSTRAINT "FK_Choices_Questions_QuestionId" FOREIGN KEY ("QuestionId") REFERENCES "Questions" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Hints" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Hints" PRIMARY KEY AUTOINCREMENT,
    "QuestionId" INTEGER NOT NULL,
    "Text" TEXT NOT NULL,
    "Order" INTEGER NOT NULL,
    CONSTRAINT "FK_Hints_Questions_QuestionId" FOREIGN KEY ("QuestionId") REFERENCES "Questions" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_Choices_QuestionId" ON "Choices" ("QuestionId");

CREATE INDEX "IX_Hints_QuestionId" ON "Hints" ("QuestionId");

CREATE INDEX "IX_Questions_QuizId" ON "Questions" ("QuizId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260206142014_AddQuizModels', '10.0.2');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "Questions" ADD "ModelAnswer" TEXT NOT NULL DEFAULT '';

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260223142023_AddModelAnswerToQuestions', '10.0.2');

COMMIT;

BEGIN TRANSACTION;
CREATE TABLE "ef_temp_Quizzes" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Quizzes" PRIMARY KEY AUTOINCREMENT,
    "CreatedAt" TEXT NOT NULL,
    "Description" TEXT NULL,
    "IsActive" INTEGER NOT NULL,
    "Title" TEXT NOT NULL
);

INSERT INTO "ef_temp_Quizzes" ("Id", "CreatedAt", "Description", "IsActive", "Title")
SELECT "Id", "CreatedAt", "Description", "IsActive", "Title"
FROM "Quizzes";

COMMIT;

PRAGMA foreign_keys = 0;

BEGIN TRANSACTION;
DROP TABLE "Quizzes";

ALTER TABLE "ef_temp_Quizzes" RENAME TO "Quizzes";

COMMIT;

PRAGMA foreign_keys = 1;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260430082510_RemoveTimeLimitFromQuiz', '10.0.2');

