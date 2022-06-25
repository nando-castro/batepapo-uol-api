import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect(() => {
  db = mongoClient.db("batepapo_uol");
});

const app = express();
app.use(cors());
app.use(express.json());

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

  if (name === null || name === "") {
    res.sendStatus(422);
  } else {
    try {
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
    } catch (error) {
      res.sendStatus(500);
    }
  }
});

/* Messages Routes */

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;

  try {
    await db
      .collection("messages")
      .insertOne({ from: user, to: to, text: text, type: type });
      res.sendStatus(201);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.listen(5000, () => {
  console.log("Server is litening on port 5000.");
  console.log("http://localhost:5000");
});
