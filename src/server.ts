import express from "express";
import cors from "cors";
import { PrismaClient, Tweet } from "@prisma/client";
import cron from "node-cron";
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
app.get("/notifications", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      res.status(400).send({ errors: ["Token not found"] });
      return;
    }
    const user = await getCurrentUser(token);
    if (!user) {
      res.status(404).send({ errors: ["User not found"] });
      return;
    }
    res.send(user.notifications);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.patch("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["Id not provided"] });
      return;
    }
    const errors: string[] = [];
    if (typeof req.body.avatar !== "string") {
      errors.push("Avatar not provided or is not a striing");
    }
    if (errors.length === 0) {
      const user = await prisma.user.update({
        where: { id },
        data: {
          avatar: req.body.avatar,
        },
        include: {
          tweets: {
            include: {
              comments: true,
              author: true,
              selectedTopic: true,
              likes: true,
            },
          },
          selecedTopics: { include: { topic: true } },
          notifications: true,
          followedBy: { include: { friend2: true } },
          following: {
            include: {
              friend1: {
                include: {
                  tweets: {
                    include: { author: true, likes: true, comments: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!user) {
        res.status(404).send({ errors: ["User not found"] });
        return;
      }
      res.send(user);
    } else {
      res.status(400).send({ errors });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/tweets", async (req, res) => {
  try {
    const tweet = await prisma.tweet.findMany({
      include: {
        likes: true,
      },
    });
    res.send(tweet);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["User id not provided"] });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tweets: true,
        followedBy: { include: { friend1: true, friend2: true } },
        following: {
          include: { friend1: { include: { tweets: true } }, friend2: true },
        },
      },
    });
    if (!user) {
      res.status(404).send({ errors: ["User not found"] });
      return;
    }

    res.send(user);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/users/:id/followers", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["User id not provided"] }); //
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { followedBy: { include: { friend2: true } } },
    });
    if (!user) {
      res.status(404).send({ errors: ["User not found"] });
      return;
    }
    const followers: any = [];
    for (let r of user.followedBy) {
      followers.push(r.friend2);
    }
    if (followers.length === 0) {
      res.send("No followers");
    } else {
      res.send(followers);
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.get("/users/:id/following", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["User id not provided"] }); //
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id },
      include: { following: { include: { friend1: true } } },
    });
    if (!user) {
      res.status(404).send({ errors: ["User not found"] });
      return;
    }
    const following: any = [];
    for (let r of user.following) {
      following.push(r.friend1);
    }
    if (following.length === 0) {
      res.send("You follow no one");
    } else {
      res.send(following);
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.get("/search-users/:name", async (req, res) => {
  try {
    const name = req.params.name;
    if (!name) {
      res.status(400).send({ errors: ["Name not provided"] });
      return;
    }
    const results = await prisma.user.findMany({
      where: { name: { contains: name } },
    });
    if (results.length === 0) {
      res.status(400).send({ errors: ["User not found"] });
    } else {
      res.send(results);
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.post("/follow", async (req, res) => {
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
    const data = {
      friend1Id: req.body.friend1Id,
      friend2Id: user.id,
    };
    const errors: string[] = [];
    if (typeof data.friend1Id !== "number") {
      errors.push("Friend1Id missing or not a number");
    }
    if (typeof data.friend2Id !== "number") {
      errors.push("Friend2Id missing or not a number");
    }
    let friendship = {
      friend1Id: data.friend1Id,
      friend2Id: data.friend2Id,
    };
    const friendships = await prisma.friendship.findMany();
    for (let f of friendships) {
      if (
        f.friend1Id === friendship.friend1Id &&
        f.friend2Id === friendship.friend2Id
      ) {
        errors.push("You already follow this person");
      }
    }

    if (errors.length === 0) {
      if (user.id === data.friend1Id) {
        res.status(400).send({ errors: ["You can't follow yourself"] });
      } else {
        await prisma.friendship.create({
          data: {
            friend1Id: data.friend1Id,
            friend2Id: data.friend2Id,
          },
        });
        res.send({ message: `You started following ${data.friend1Id}` });
      }
    } else {
      res.status(400).send({ errors });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.delete("/unfollow", async (req, res) => {
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
    const data = {
      friend1Id: req.body.friend1Id,
      friend2Id: user.id,
    };
    const errors: string[] = [];
    if (typeof data.friend1Id !== "number") {
      errors.push("Friend1Id missing or not a number");
    }
    if (typeof data.friend2Id !== "number") {
      errors.push("Friend2Id missing or not a number");
    }
    if (errors.length === 0) {
      //   if (user.id === data.friend1Id) {
      //     res.status(400).send({ errors: ["You can't follow yourself"] });
      //   } else {
      await prisma.friendship.delete({
        where: {
          friend1Id_friend2Id: {
            friend1Id: data.friend1Id,
            friend2Id: data.friend2Id,
          },
        },
      });
      res.send({ message: `You unfollowed ${data.friend1Id}` });
      // }
    } else {
      res.status(400).send({ errors });
    }
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
app.get("/tweets/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["User id not provided"] });
      return;
    }

    const tweet = await prisma.tweet.findUnique({
      where: { id },
      include: {
        author: true,
        comments: true,
        likes: true,
        selectedTopic: { include: { topic: true } },
      },
    });
    if (!tweet) {
      res.status(404).send({ errors: ["Tweet not found"] });
      return;
    }

    res.send(tweet);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
// get all comments (won't use it, I just need it for testing stuff)
app.get("/comments", async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      include: { author: true, tweet: true },
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
          include: {
            comments: { include: { author: true } },
            likes: true,
            author: true,
          },
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
        comments: { include: { author: true } },
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
  try {
    const errors: string[] = [];

    if (typeof req.body.name !== "string") {
      errors.push("Name missing or not a string");
    }
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
      res.status(400).send({ errors: ["Email has already been taken."] });
      return;
    }
    // creates a new user
    const user = await prisma.user.create({
      data: {
        name: req.body.name,
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
    if (req.body.image && typeof req.body.image !== "string") {
      errors.push("image missing or not a string");
    }
    if (req.body.selctedTopic && typeof req.body.selectedTopicId !== "number") {
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
          image: req.body.image,
          selectedTopicTopicId: req.body.selectedTopicTopicId,
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
          text: `${user.name} commented on your tweet`,
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

app.post("/likes-for-tweet/:id", async (req, res) => {
  try {
    const data = {
      tweetId: req.body.tweetId,
    };
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["No id provided"] });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id } });
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
          text: `${user.name} liked your tweet`,
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

// gets tweets that should appear on a users home page
// either tweets from users he/she follows or tweets that have a topic from from users selected topics

app.get("/tweets-for-user", async (req, res) => {
  try {
    //user should send a token wich is needed to verify that user / check if he is signed in
    const token = req.headers.authorization;
    //if there is something wrong with te thoken sends an error
    if (!token) {
      res.status(400).send({ errors: ["Token not provided"] });
      return;
    }
    // else creates the user
    const user = await getCurrentUser(token);
    // if the user for some reason does not exist sends an error
    if (!user) {
      res.status(404).send({ errors: ["User not found"] });
      return;
    }
    // find all the tweets
    const tweets = await prisma.tweet.findMany({
      include: {
        author: true,
        likes: true,
        selectedTopic: { include: { topic: true } },
        comments: true,
      },
    });
    // An empty array that later is gonna have all the tweets that should show on a users wall / home page
    const tweetsForUser: Tweet[] = [];

    //loop over users selected topics
    // for (let topic of user.selecedTopics) {
    //   //fillters the tweets to get only the ones that have the a topic from users selected topics
    //   tweets.filter((tweet) => {
    //     if (topic.topicId === tweet.selectedTopicTopicId) {
    //       //checks if the tweet is already pushed in the tweetsforUser cause it's a tweet with a topic user has selected

    //       // if not:
    //       //pushes the matched tweets to the empty array
    //       tweetsForUser.push(tweet);
    //     }
    //   });
    // }
    // for (let tweet of user.tweets) {
    //   tweetsForUser.push(tweet);
    // }
    // loops over users followings (people that the user follows)
    for (let friend of user.following) {
      // maps (loops) over  followed user tweets and pushes them to the array
      // friend.friend1.tweets.map((tweet) => tweetsForUser.push(tweet));
      for (let tweet of friend.friend1.tweets) {
        tweetsForUser.push(tweet);
      }
    }
    // if (errors.length !== 0) {
    //   res.status(400).send({ errors });
    // }
    // const sortedTweets : Tweet[]= tweetsForUser.sort()
    // if tweets to send array is empty sends a message ⬇️
    if (tweetsForUser.length === 0) {
      res.send([]);
      // else sends the tweets
    } else {
      res.send(tweetsForUser);
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/likes-for-tweet/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["Tweet id not provided"] });
      return;
    }
    const tweet = await prisma.tweet.findUnique({
      where: { id },
      include: { likes: true },
    });
    if (!tweet) {
      res.status(404).send({ errors: ["Tweet not found"] });
      return;
    }
    res.send(tweet.likes);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.delete("/unlike", async (req, res) => {
  try {
    const data = {
      tweetId: Number(req.body.tweetId),
    };
    const token = req.headers.authorization;
    if (!token) {
      res.status(400).send({ errors: ["Token id provided"] });
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
      // const tweet = await prisma.tweet.findUnique({
      //   where: { id: data.tweetId },
      //   include: { author: true },
      // });
      // if (!tweet) {
      //   res.status(404).send({ errors: ["Tweet not found"] });
      //   return;
      // }
      const like = await prisma.like.delete({
        where: { userId_tweetId: { tweetId: data.tweetId, userId: user.id } },
      });

      res.send("Like deleted succssefully");
    } else {
      res.status(400).send({ errors });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
cron.schedule("30 36 13 * * *", async () => {
  const users = await prisma.user.findMany();
  let percent = 20;
  console.log(percent);
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
        text: `Congrats ${luckyUser.name} you get a comment ticket`,
      },
    });
    console.log(luckyUser);
  }
});

cron.schedule("30 35 13 * * *", async () => {
  console.log("running a task every minute");
  // app.get("/tweet-tickets", async (req, res) => {
  const users = await prisma.user.findMany();
  let percent = 20;
  console.log(50);
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
        text: `Congrats ${luckyUser.name} you get a tweet ticket`,
      },
    });
    console.log(luckyUser);
  }
  // res.send(usersWhoGetTweetTickets);
});

app.listen(port, () => {
  console.log(`App running: http://localhost:${port}`);
});
