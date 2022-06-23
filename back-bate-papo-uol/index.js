import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect(() => {
  db = mongoClient.db("batepapo_uol");
});

const app = express();
app.use(express.json());

/* Participants Routes */

//GET

app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection('participants').find().toArray();
    res.send(participants);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

//POST

app.post("/participants", async (req, res) => {
  const participant = req.body;

  try {
    await db.collection("participants").insertOne(participant);
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(422);
  }
});

app.listen(5000, () => {
  console.log("Server is litening on port 5000.");
  console.log("http://localhost:5000");
});
