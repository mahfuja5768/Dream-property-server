const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("realEstate").collection("users");    
    const propertiesCollection = client.db("realEstate").collection("properties");    
    const wishlistCollection = client.db("realEstate").collection("wishlists");
    const reviewsCollection = client.db("realEstate").collection("reviews");





    //jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    //post users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (!existingUser) {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } else {
        return res.send({ message: "user already exists", insertedId: null });
      }
    }); 
    
    
    //get properties
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    });




    //post properties
    app.post("/properties", async (req, res) => {
      const property = req.body;
      const result = await propertiesCollection.insertOne(property);
      res.send(result)
    });  
    
    //get properties
    app.get("/properties", async (req, res) => {
      const result = await propertiesCollection.find().toArray();
      res.send(result)
    });

    //get single properties
    app.get("/properties/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await propertiesCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

      //add review
      app.post("/reviews", async (req, res) => {
        try {
          const review = req.body;
          const result = await reviewsCollection.insertOne(review);
          res.send(result);
        } catch (error) {
          console.log(error);
        }
      });

    //add to wishlist
    app.post("/wishlists", async (req, res) => {
      try {
        const wishlist = req.body;
        const result = await wishlistCollection.insertOne(wishlist);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get wishlist Blogs
    app.get("/wishlists", async (req, res) => {
      try {
        let query = {};
        if (req.query?.email) {
          query = { email: req.query.email };
        }
        const result = await wishlistCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
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
