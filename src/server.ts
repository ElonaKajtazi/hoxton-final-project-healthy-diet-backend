import express from "express";
import cors from "cors";
// import dotenv from "dotenv"
// import jwt from "jsonwebtoken"
// import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const port = 4567;

app.get("/", (req, res) => {
  res.send("Let's start again");
});

app.listen(port, () => {
  console.log(`App running: http://localhost:${port}`);
});
