import { auth } from "@clerk/nextjs/server";
import { prisma } from "@repo/db";

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  return user;
}

export async function createUserIfNotExists(clerkId: string, email: string, name?: string) {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: clerkId,
    },
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      id: clerkId,
      email,
      name,
    },
  });
} 