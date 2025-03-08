import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Export the prisma client directly
export { prisma };
