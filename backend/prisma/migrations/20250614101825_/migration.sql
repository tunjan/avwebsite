/*
  Warnings:

  - You are about to drop the column `userId` on the `QRCode` table. All the data in the column will be lost.
  - Added the required column `creatorId` to the `QRCode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `QRCode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `QRCode` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "QRCode" DROP CONSTRAINT "QRCode_userId_fkey";

-- AlterTable
ALTER TABLE "QRCode" DROP COLUMN "userId",
ADD COLUMN     "creatorId" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
