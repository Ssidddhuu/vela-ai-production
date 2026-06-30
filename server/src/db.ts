import { PrismaClient } from "@prisma/client";

// A single Prisma client for the whole app.
export const prisma = new PrismaClient();
