-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_teamId_fkey";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "regionId" TEXT,
ADD COLUMN     "scope" "TrainingScope" NOT NULL DEFAULT 'CITY',
ALTER COLUMN "teamId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
