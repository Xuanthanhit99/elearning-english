ALTER TABLE "PetProfile" ADD COLUMN "isChosen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PetProfile" ADD COLUMN "chooseDeadline" TIMESTAMP(3);
ALTER TABLE "PetProfile" ADD COLUMN "selectedAt" TIMESTAMP(3);
ALTER TABLE "PetProfile" ADD COLUMN "randomAssigned" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PetProfile"
SET "chooseDeadline" = "createdAt" + INTERVAL '7 days'
WHERE "chooseDeadline" IS NULL;