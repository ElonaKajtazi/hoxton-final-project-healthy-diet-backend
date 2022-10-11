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

const port = 4443;

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
  // const data = {
  //   email: req.body.email,
  //   password: req.body.email,
  // };
  try {
    const errors: string[] = [];

    if (typeof req.body.email !== "string") {
      errors.push("Email missing or not a string");
    }

    if (typeof req.body.password !== "string") {
      errors.push("Password missing or not a string");
    }

    if (errors.length > 0) {
      ///
      res.status(400).send({ errors });
      return;
    }
    // checking if there exists a user with the same email
    const existingUser = await prisma.user.findUnique({
      where: { email: req.body.email },
    });
    if (existingUser) {
      res.status(400).send({ errors: ["Email already exists."] });
      return;
    }
    // creates a new user
    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        password: hash(req.body.password),
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

app.post("/sign-in", async (req, res) => {
  try {
    // const data = {
    //   email: req.body.email,
    //   password: req.body.password,
    // };

    let errors: string[] = [];

    if (typeof req.body.email !== "string") {
      errors.push("Email missing or not a string");
    }
    if (typeof req.body.password !== "string") {
      errors.push("Password missing or not a string");
    }
    if (errors.length > 0) {
      res.status(400).send({ errors });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { email: req.body.email },
      include: { tweets: true },
    });
    console.log(user);
    if (user && verify(req.body.password, user.password)) {
      const token = generateToken(user.id);
      res.send({ user, token });
    } else {
      res.status(400).send({ errors: ["Invalid email or password"] });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ error: [error.message] });
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

app.post("/tweets", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    res.status(401).send({ errors: ["No token provided."] });
    return;
  }
  const user = await getCurrentUser(token);
  if (!user) {
    res.status(404).send({ errors: ["User not found"] });
    return;
  }
  if (Number(user.twwetTicket) === 0) {
    res.status(400).send({ errors: ["Not enough tweet tickets"] });
    return;
  }
  prisma.user.update({
    where: { id: user.id },
    data: {
      twwetTicket: 0,
    },
  });
  const tweet = await prisma.tweet.create({
    data: {
      authorId: user.id,
      text: req.body.text,
    },
    include: { author: true },
  });

  res.send(tweet);
});
app.listen(port, () => {
  console.log(`App running: http://localhost:${port}`);
});
