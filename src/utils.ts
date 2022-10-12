import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient();
dotenv.config();

export function hash(password: string) {
  return bcrypt.hashSync(password, 5);
}

export function verify(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}
export function generateToken(id: number) {
  return jwt.sign({ id }, process.env.SECRET!, { expiresIn: "1 day" });
}

export async function getCurrentUser(token: string) {
  try {
    const data = jwt.verify(token, process.env.SECRET!);

    const user = await prisma.user.findUnique({
      where: { id: (data as any).id },
      include: { tweets: true },
    });
    return user;
  } catch (error) {
    return null;
  }
}
export function getMultipleRandom(arr: User[], num: number) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());

  return shuffled.slice(0, num);
}