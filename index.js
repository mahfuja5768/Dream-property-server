const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;




const client = new MongoClient(process.env.DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

app.use(cors());
app.use(express.json());









app.get("/", (req, res) => {
    res.send("Dream property is running....");
  });
  
  app.listen(port, (req, res) => {
    console.log(`Dream property is running on ${port}`);
  });