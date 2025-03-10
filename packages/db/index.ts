import { PrismaClient } from "@prisma/client";

// Create a global singleton to avoid multiple Prisma instances
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure PrismaClient with appropriate options
const prisma = globalForPrisma.prisma || 
  new PrismaClient({
    log: ['error', 'warn'],
  });

// Save prisma client in global to prevent multiple instances in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Export the prisma client directly
export { prisma };
