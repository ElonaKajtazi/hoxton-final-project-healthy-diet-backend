import express from "express";
import cors from "cors";
// import dotenv from "dotenv"
// import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateToken, getCurrentUser, hash, verify } from "./utils";
const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const port = 4444;

app.get("/", (req, res) => {
  res.send("Let's start again");
});

//Gets all the users, including their tweets
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({ include: { tweets: true } });
    res.send(users);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
// creates a new user
app.post("/sign-up", async (req, res) => {
  //data that user sends..
  const data = {
    email: req.body.email,
    password: req.body.email,
  };
  try {
    const errors: string[] = [];

    if (typeof data.email !== "string") {
      errors.push("Email missing or not a string");
    }

    if (typeof data.password !== "string") {
      errors.push("Password missing or not a string");
    }

    if (errors.length > 0) {
      ///
      res.status(400).send({ errors });
      return;
    }
    // checking if there exists a user with the same email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      res.status(400).send({ errors: ["Email already exists."] });
      return;
    }
    // creates a new user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hash(data.password),
      },
      include: { tweets: true },
    });
    //Generates a new token
    const token = generateToken(user.id);
    res.send({ user, token });
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

// app.post("/sign-in", async (req, res) => {
//   try {
//     const data = {
//       email: req.body.email,
//       password: req.body.password,
//     };

//     let errors: string[] = [];

//     if (typeof data.email !== "string") {
//       errors.push("Email missing or not a string");
//     }
//     if (typeof data.password !== "string") {
//       errors.push("Password missing or not a string");
//     }
//     if (errors.length > 0) {
//       res.status(400).send({ errors });
//       return;
//     }
//     const user = await prisma.user.findUnique({
//       where: { email: data.email },
//       include: { tweets: true },
//     });
//     console.log(user);
//     if (user && verify(data.password, user.password)) {
//       const token = generateToken(user.id);
//       res.send({ user, token });
//     } else {
//       res.status(400).send({ errors: ["Invalid email or password"] });
//     }
//   } catch (error) {
//     //@ts-ignore
//     res.status(400).send({ error: [error.message] });
//   }
// });
app.post("/sign-in", async (req, res) => {
  try {
    const { email, password } = req.body;
    const errors: string[] = [];

    if (typeof email !== "string") {
      errors.push("Email missing or not a string");
    }

    if (typeof password !== "string") {
      errors.push("Password missing or not a string");
    }

    if (errors.length > 0) {
      res.status(400).send({ errors });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tweets: true,
      },
    });

    if (user && verify(password, user.password)) {
      const token = generateToken(user.id);
      // const verified = verify(String(password), String(user.password))
      // console.log(verified)
      res.send({ user, token});
    } else {
      res.status(400).send({ errors: ["Username/password invalid."] });
    }
  } catch (error) {
    // @ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.get("/validate", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (token) {
      const user = await getCurrentUser(token);
      if (user) {
        const newToken = generateToken(user.id);
        res.send({ user, token: newToken });
      } else {
        res.status(400).send({ errors: ["Token invalid"] });
      }
    } else {
      res.status(400).send({ errors: ["Token not provided"] });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.post("/tweets", async (req, res) => {});
app.listen(port, () => {
  console.log(`App running: http://localhost:${port}`);
});
