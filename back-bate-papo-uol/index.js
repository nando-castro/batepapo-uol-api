import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import Joi from "joi";
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect(() => {
  db = mongoClient.db("batepapo_uol");
});

const app = express();
app.use(cors());
app.use(express.json());

const participantsSchema = Joi.object({
  name: Joi.string().min(1).required,
});

const messageSchema = Joi.object({
  to: Joi.string().min(1).required(),
  text: Joi.string().min(1).required(),
  type: Joi.string().valid("message", "private_message").required(),
});

/* Participants Routes */

//GET
app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.send(participants);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

//POST
app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const { error } = participantsSchema.validate(name);

  /* if (error) {
    const detalhes = error.details.map((detail) => detail.message);
    res.status(422).send(detalhes);
  } */

  try {
    const user = await db.collection("participants").findOne(req.body);
    if (user) {
      res.sendStatus(409);
    } else {
      await db
        .collection("participants")
        .insertOne({ name: name, lastStatus: Date.now() });
      await db.collection("message").insertOne({
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      });
      res.sendStatus(201);
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

/* Messages Routes */

//POST
app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  //const message = req.body;

  const { user } = req.headers;

  /* const validacao = messageSchema.validate(to, text, type, user);
  
  const { error } = validacao;
  
  if (error) {
    const details = error.details.map((e) => e.message);
    res.status(422).send(details);
    return;
  } */

  try {
    const participant = await db.collection("participants").findOne(user);

    if (!participant) {
      res.sendStatus(422);
      return;
    } else {
      await db.collection("messages").insertOne({
        from: user,
        to: to,
        text: text,
        type: type,
        time: dayjs().format("HH:mm:ss"),
      });
      res.sendStatus(201);
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

//GET
app.get("/messages", async (req, res) => {
  const { limit } = req.query;
  const { user } = req.headers;
  let messages;

  try {
    const participant = await db
      .collection("participants")
      .findOne({ name: user });
    if (!participant) {
      res.sendStatus(404);
      return;
    }
  } catch (error) {
    res.sendStatus(500);
  }
  try {
    messages = await db
      .collection("messages")
      .find()
      .sort({ $natural: -1 })
      .toArray();
    res.send(messages);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }

  const messagesVal = messages.filter((message) => {
    if (
      message.to === "Todos" ||
      message.to === user ||
      message.from === user
    ) {
      return message;
    }
    return false;
  });

  /*   let messagesVisible = [];
  let limite;
  if(limit){
    limite = parseInt(limit);
    for(let i = 0; i < limite; i++){
      messagesVisible.push(messagesVal[i]);
      if(i === messagesVal.length -1){
        break;
      }
    }
  }else{
    limite = 100;
    for(let i = 0; i < limite; i++){
      messagesVisible.push(messagesVal[i]);
      if(i === messagesVal.length -1){
        break;
      }
    }
  }
  res.send(messagesVisible); */
});

/* Status Routes */

//POST
app.post("/status", async (req, res) => {
  const user = req.headers.user;
  try {
    const participant = await db
      .collection("participants")
      .findOne({ name: user });
    if (!participant) {
      res.sendStatus(404);
      return;
    }
  } catch (error) {
    res.sendStatus(500);
  }
  try {
    await db
      .collection("users")
      .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
  } catch (error) {
    res.status(500).send(error);
  }
  res.sendStatus(200);
});

//USER INATIVO
setInterval(async () => {
  let users;
  try {
    users = await db.collection("participants").find().toArray();
  } catch (error) {
    console.log(error);
  }
  for (let i = 0; i < users.length; i++) {
    //let time = Date.now();
    if (Date.now() - users[i].lastStatus >= 10000) {
      let deleteUser;
      try {
        deleteUser = await db
          .collection("participants")
          .deleteOne({ name: users[i].name });
        if (deleteUser) {
          try {
            await db.collection("messages").insertOne({
              from: users[i].name,
              to: "Todos",
              text: "sai da sala...",
              type: "status",
              time: dayjs().format("HH:mm:ss"),
            });
          } catch (error) {
            console.log(error);
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  }
}, 15000);

app.listen(5000, () => {
  console.log("Server is litening on port 5000.");
  console.log("http://localhost:5000");
});
