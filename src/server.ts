import express from "express";
import cors from "cors";
import {
  PrismaClient,
  SelectedTopic,
  Topic,
  Tweet,
  User,
} from "@prisma/client";
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

const port = 4443;

app.get("/", (req, res) => {
  res.send("Let's start again");
});

//Gets all the users, including their tweets
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        tweets: { include: { comments: true, likes: true } },
        selecedTopics: { include: { topic: true } },
        notifications: true,
      },
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
// get all comments (won't use it, I just need it for testing stuff)
app.get("/comments", async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      include: { likes: true, author: true, tweet: true },
    });
    res.send(comments);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
//get all topics
app.get("/topics", async (req, res) => {
  try {
    const topics = await prisma.topic.findMany();
    res.send(topics);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
// get all tweets for a specific user
app.get("/tweets-per-user/:id", async (req, res) => {
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
app.get("/users-selected-topics/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["User id not provided"] });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id },
      include: { selecedTopics: { include: { topic: true } } },
    });
    if (!user) {
      res.status(404).send({ errors: ["User not found"] });
      return;
    }
    res.send(user.selecedTopics);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/comments-per-tweet/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["Tweet id not provided"] });
      return;
    }
    const tweet = await prisma.tweet.findUnique({
      where: { id },
      include: {
        comments: { include: { author: true, likes: true } },
      },
    });
    if (!tweet) {
      res.status(404).send({ errors: ["Tweet not found"] });
      return;
    }
    res.send(tweet.comments);
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
    if (req.body.selctedTopic &&  typeof req.body.selectedTopicId !== "number") {
      errors.push("selectedTopiId missing or not a string");
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
          selectedTopicId: req.body.selectedTopicId,
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
        include: { author: true },
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
      await prisma.notification.create({
        data: {
          userId: tweet.authorId,
          text: `${user.email} commented on your tweet`,
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

app.post("/likes-for-tweets", async (req, res) => {
  try {
    const data = {
      tweetId: req.body.tweetId,
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

    const errors: string[] = [];

    if (typeof data.tweetId !== "number") {
      errors.push("tweet id not provided or not a number");
    }

    if (errors.length === 0) {
      const tweet = await prisma.tweet.findUnique({
        where: { id: data.tweetId },
        include: { author: true },
      });
      if (!tweet) {
        res.status(404).send({ errors: ["Tweet not found"] });
        return;
      }
      const like = await prisma.like.create({
        data: {
          userId: user.id,
          tweetId: data.tweetId,
        },
      });
      await prisma.notification.create({
        data: {
          userId: tweet.authorId,
          text: `${user.email} liked your tweet`,
        },
      });
      res.send(like);
    } else {
      res.status(400).send({ errors });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.post("/likes-for-comment", async (req, res) => {
  try {
    const data = {
      commentId: req.body.commentId,
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

    const errors: string[] = [];

    if (typeof data.commentId !== "number") {
      errors.push("Comment id not provided or not a number");
    }

    if (errors.length === 0) {
      const comment = await prisma.comment.findUnique({
        where: { id: data.commentId },
        include: { author: true },
      });
      if (!comment) {
        res.status(404).send({ errors: ["Comment not found"] });
        return;
      }
      const like = await prisma.like.create({
        data: {
          userId: user.id,
          commentId: data.commentId,
        },
      });
      await prisma.notification.create({
        data: {
          userId: comment.authorId,
          text: `${user.email} liked your comment`,
        },
      });
      res.send(like);
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

    await prisma.notification.create({
      data: {
        userId: luckyUser.id,
        text: `Congrats ${luckyUser.email} you get a tweet ticket`,
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
    await prisma.notification.create({
      data: {
        userId: luckyUser.id,
        text: `Congrats ${luckyUser.email} you get a comment ticket`,
      },
    });
  }
  res.send(usersWhoGetTweetTickets);
});

app.get("/selected-topics", async (req, res) => {
  try {
    const selctedTopics = await prisma.selectedTopic.findMany({
      include: { topic: true },
    });

    res.send(selctedTopics);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
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
// app.post("/selected-topic", async (req, res) => {
//   try {
//     const token = req.headers.authorization;
//     if (!token) {
//       res.status(401).send({ errors: ["No token provided."] });
//       return;
//     }
//     const user = await getCurrentUser(token);
//     if (!user) {
//       res.status(401).send({ errors: ["Invalid token provided."] });
//       return;
//     }
//     const data = {
//       userId: user.id,
//       topicId: req.body.topicId,
//     };
//     const topic = await prisma.topic.findUnique({
//       where: { id: data.topicId },
//     });
//     if (!topic) {
//       res.status(404).send({ errors: ["Topic not found"] });
//       return;
//     }
//     let errors: string[] = [];
//     if (typeof data.topicId !== "number") {
//       errors.push("Topic id not provided or not a string");
//     }
//     if (typeof data.userId !== "number") {
//       errors.push("User id not provided or not a string");
//     }
//     // const selectedTopics = await prisma.selectedTopic.findMany({include:{topic:true}});

//     if (errors.length === 0) {
//       const selectedTopic = await prisma.selectedTopic.create({
//         data: {
//           userId: data.userId,
//           topicId: data.topicId,
//         },
//         include: { topic: true },
//       });
//       // const topicsToSend: Topic[] = [];
//       // for (let t of user.selecedTopics) {
//       //   topicsToSend.push(selectedTopic.topic);
//       // }

//       // for(let topic of topicsToSend) {
//       //   if(topic.name !== selectedTopic.topic.name) {

//       //   }
//       // }
//       res.send(selectedTopic);
//     } else {
//       res.status(400).send({ errors });
//     }
//   } catch (error) {
//     // @ts-ignore
//     res.status(400).send({ errors: [error.message] });
//   }
// });
app.post("/selected-topics/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["Invalid user id"] });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id },
      include: { selecedTopics: true },
    });
    if (!user) {
      res.status(404).send({ errors: ["User not found"] });
      return;
    }
    const data = {
      topicId: req.body.topicId,
    };
    const selectedTopic = await prisma.selectedTopic.create({
      data: {
        userId: id,
        topicId: data.topicId,
      },
    });
    // const selectedTopics = removeDuplicates(user.selecedTopics, selctedTopic); //nopeeeee
    res.send(selectedTopic);

    // for (let topic of user.selecedTopics) {
    //   if (data.topicId !== topic.topic.id) {
    //     await prisma.selectedTopic.create({
    //       data: {
    //         userId: data.userId,
    //         topicId: data.topicId,
    //       },
    //     });
    //   } else {
    //   }
    // }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }

  // console.log(user.selecedTopics);
});
app.get("/tweets-for-user", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      res.status(400).send({ errors: ["Token not provided"] });
      return;
    }
    const user = await getCurrentUser(token);

    if (!user) {
      res.status(404).send({ errors: ["User not found"] });
      return;
    }
    const tweets = await prisma.tweet.findMany();

    const tweetsForUser: Tweet[] = [];
    for (let topic of user.selecedTopics) {
      tweets.filter((tweet) => {
        if (topic.topic.id === tweet.selectedTopicId) {
          tweetsForUser.push(tweet);
        }
      });

      res.send(tweetsForUser);
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

// app.post("/choosen-topics", async (req, res) => {
//   try {
//     const token = req.headers.authorization;
//     if (token) {
//       const user = await getCurrentUser(token);
//       if (!user) {
//         res.status(400).send({ errors: ["Invalid token"] });
//       } else {
//         for (let item of user.selecedTopics) {
//           await prisma.choosenTopic.create({
//             data: {
//               userId: item.userId,
//               topicId: item.topicId,
//             },
//           });

//           await prisma.selectedTopic.delete({ where: { id: item.id } });
//         }

//         res.send({ message: "Topics choosen succssesfully" });
//       }
//     } else {
//       res.status(400).send({ errors: ["Token not found"] });
//     }
//   } catch (error) {
//     //@ts-ignore
//     res.status(400).send({ errors: [error.message] });
//   }
// });
app.listen(port, () => {
  console.log(`App running: http://localhost:${port}`);
});

//NOTE to myself for tomorrow:
//1. I need to show the user a list of all the available topics (a get end point for topics) ✅
//2. Create a model for choosen topic 1:m relation with the user (so when the user clicks (frontend) a topic creates a selected topic),  === another end point to crate the selected topic... ✅
//3. To create a userTopic loop over the selected topics ✅
//  3.1 for every selected topic, create a usertopic and delete the selected topic... ✅

// need to figure out the relation situation for current topic model...✅

// I have the problem that when I create a selected topic I can choose the the same topic multiple time 😐 means I will have the same choosen topic for user multiple times wich does not make sens. For now I hope I can solve this with fornt end!
