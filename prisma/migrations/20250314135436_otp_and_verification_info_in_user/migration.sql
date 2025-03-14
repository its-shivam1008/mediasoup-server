/*
  Warnings:

  - Added the required column `isVerified` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `verifyCode` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `verifyCodeExpiry` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isVerified" BOOLEAN NOT NULL,
ADD COLUMN     "verifyCode" TEXT NOT NULL,
ADD COLUMN     "verifyCodeExpiry" TIMESTAMP(3) NOT NULL;
