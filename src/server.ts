import express from "express";
import cors from "cors";
import { PrismaClient, User } from "@prisma/client";
import {
  generateToken,
  getCurrentUser,
  hash,
  verify,
  getMultipleRandom,
} from "./utils";
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
    const users = await prisma.user.findMany({
      include: { tweets: { include: { comments: true } } },
    });
    res.send(users);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

//get all tweets
app.get("/tweets", async (req, res) => {
  try {
    const tweets = await prisma.tweet.findMany({
      include: { author: true, comments: true },
    });
    res.send(tweets);
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
// sign in the user
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
// check if ther is a user signed in
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
// get all tweets for a specific user
app.get("/tweetsPerUser/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["User id not provided"] });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tweets: {
          include: { comments: { include: { author: true } } },
        },
      },
    });
    if (!user) {
      res.status(404).send({ errors: ["User not found"] });
      return;
    }
    res.send(user.tweets);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
//create a tweet
app.post("/tweets", async (req, res) => {
  try {
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
    // console.log(user.twwetTicket);
    // console.log(user.email);
    if (Number(user.twwetTicket) === 0) {
      res.status(400).send({ errors: ["Not enough tweet tickets"] });
      return;
    }
    const errors: string[] = [];
    if (typeof req.body.text !== "string") {
      errors.push("text missing or not a string");
    }
    if (errors.length === 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twwetTicket: user.twwetTicket - 1,
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
    } else {
      res.status(400).send({ errors });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
//create a comment
app.post("/comments", async (req, res) => {
  try {
    const data = {
      text: req.body.text,
      tweetId: req.body.tweetId,
      image: req.body.image,
    };
    const token = req.headers.authorization;
    if (!token) {
      res.status(400).send({ errors: ["No token provided"] });
      return;
    }
    const user = await getCurrentUser(token);
    if (!user) {
      res.status(404).send({ errors: ["User not found"] });
      return;
    }
    if (user.commentTicket === 0) {
      res.status(400).send({ errors: ["Not enough comment tickets"] });
      return;
    }

    // I need to check if author of the tweet is trying to comment on his own tweet and not let it happen...
    // means  tweet.authorId === comment.authorId
    // if(user.id === Number(req.body.a))

    const errors: string[] = [];

    if (typeof data.text !== "string") {
      errors.push("Text not provided or not a string");
    }
    if (typeof data.tweetId !== "number") {
      errors.push("tweet id not provided or not a number");
    }
    if (data.image && typeof data.image !== "string") {
      errors.push("Image not provided or not a string");
    }

    if (errors.length === 0) {
      const tweet = await prisma.tweet.findUnique({
        where: { id: data.tweetId },
      });
      if (!tweet) {
        res.status(404).send({ errors: ["Tweet not found"] });
        return;
      }
      if (tweet.authorId === user.id) {
        res.status(400).send({
          errors: ["Why would you want to comment on your own tweet?"],
        });
        return;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: {
          commentTicket: user.commentTicket - 1,
        },
      });
      const comment = await prisma.comment.create({
        data: {
          text: data.text,
          authorId: user.id,
          tweetId: data.tweetId,
          image: data.image,
        },
      });

      res.send(comment);
    } else {
      res.status(400).send({ errors });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
//generate tweet tickets randomly (need to find a way to make this happen every 24 hours)
app.get("/tweet-tickets", async (req, res) => {
  const users = await prisma.user.findMany();
  let percent = 10;
  let percentage = Math.round((users.length / 100) * percent);
  const usersWhoGetTweetTickets = getMultipleRandom(users, percentage);
  for (let luckyUser of usersWhoGetTweetTickets) {
    await prisma.user.update({
      where: { id: luckyUser.id },
      data: {
        twwetTicket: luckyUser.twwetTicket + 1,
      },
    });
  }
  res.send(usersWhoGetTweetTickets);
});

//generate comment tickets randomly (need to find a way to make this happen every 24 hours)
app.get("/comment-tickets", async (req, res) => {
  const users = await prisma.user.findMany();
  let percent = 10;
  let percentage = Math.round((users.length / 100) * percent);
  const usersWhoGetTweetTickets = getMultipleRandom(users, percentage);
  for (let luckyUser of usersWhoGetTweetTickets) {
    await prisma.user.update({
      where: { id: luckyUser.id },
      data: {
        commentTicket: luckyUser.commentTicket + 1,
      },
    });
  }
  res.send(usersWhoGetTweetTickets);
});
// app.post("/topics-for-users/:id", async (req, res) => {
//   const id = Number(req.params.id);
//   const token = req.headers.authorization;
//   if (!token) {
//     res.status(401).send({ errors: ["No token provided."] });
//     return;
//   }
//   const user = await getCurrentUser(token);
//   if (!user) {
//     res.status(404).send({ errors: ["User not found"] });
//     return;
//   }
//   if (!id) {
//     res.status(400).send({ errors: ["Topic id not provided"] });
//     return;
//   }
//   const topic = await prisma.topic.findUnique({ where: { id } });

// });

app.listen(port, () => {
  console.log(`App running: http://localhost:${port}`);
});
//NOTE to myself for tomorrow:
//1. I need to show the user a list of all the available topics (a get end point for topics)
//2. Create a model for chosen topic 1:m relation with the user (so when the user clicks (frontend) a topic creates a selected topic),  === another end point to crate the selected topic...
//3. To create a userTopic loop over the selected topics
//  3.1 for every selected topic, create a usertopic and delete the selected topic...

// need to figure out the relation situation for current topic model...