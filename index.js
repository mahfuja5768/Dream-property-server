const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());









app.get("/", (req, res) => {
    res.send("Dream property is running....");
  });
  
  app.listen(port, (req, res) => {
    console.log(`Dream property is running on ${port}`);
  });