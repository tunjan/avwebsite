/*
  Warnings:

  - You are about to drop the column `duration` on the `Event` table. All the data in the column will be lost.
  - Added the required column `endTime` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "duration",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL;
