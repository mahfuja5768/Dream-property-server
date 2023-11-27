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
    const propertiesCollection = client
      .db("realEstate")
      .collection("properties");
    const wishlistCollection = client.db("realEstate").collection("wishlists");
    const reviewsCollection = client.db("realEstate").collection("reviews");
    const offerPropertiesCollection = client
      .db("realEstate")
      .collection("offerProperties");
    const agentAddedPropertiesCollection = client
      .db("realEstate")
      .collection("agentAddedProperties");
    const soldPropertiesCollection = client
      .db("realEstate")
      .collection("soldProperties");

    //jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      // console.log("inside verifyToken", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    //use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      next();
    };

    //post users
    app.post("/users", verifyToken, async (req, res) => {
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

    //update users
    app.patch("/users/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updateUser = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          photoUrl: updateUser.photoUrl,
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // get properties
    app.get("/properties", verifyToken, async (req, res) => {
      // console.log("hi---------------->", req.decoded);
      try {
        const verifiedProperties = await propertiesCollection
          .find({
            status: "verified",
          })
          .toArray();
        // console.log(verifiedProperties)
        res.send(verifiedProperties);
      } catch (error) {
        console.log(error);
      }
    });

    //get single properties
    app.get("/properties/:id", verifyToken, async (req, res) => {
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
    app.post("/reviews", verifyToken, async (req, res) => {
      try {
        const review = req.body;
        const result = await reviewsCollection.insertOne(review);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get reviews for  specific property
    app.get("/user-reviews/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await reviewsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get reviews
    app.get("/reviews", verifyToken, async (req, res) => {
      try {
        let query = {};
        if (req.query?.email) {
          query = { email: req.query.email };
        }
        const result = await reviewsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //delete reviews
    app.delete("/reviews/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await reviewsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //add to wishlist
    app.post("/wishlists", verifyToken, async (req, res) => {
      try {
        const wishlist = req.body;
        // console.log("w------------>", wishlist);
        const result = await wishlistCollection.insertOne(wishlist);
        console.log(result);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get wishlist properties
    app.get("/user-wishlists/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await wishlistCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //delete wishlist property
    app.delete("/wishlists/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await wishlistCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //offer for property
    app.post("/offer-properties", verifyToken, async (req, res) => {
      try {
        const property = req.body;
        const result = await offerPropertiesCollection.insertOne(property);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get offer properties for users
    app.get(
      "/offer-properties-for-buyer/:email",
      verifyToken,
      async (req, res) => {
        try {
          const email = req.params.email;
          const query = { buyerEmail: email };
          const properties = await offerPropertiesCollection
            .find(query)
            .toArray();
          // console.log('p------->',properties);

          res.send(properties);
        } catch (error) {
          console.log(error);
        }
      }
    );

    //add properties for agent
    app.post("/agent-properties", verifyToken, async (req, res) => {
      const property = req.body;
      property.status = "pending";
      const result = await agentAddedPropertiesCollection.insertOne(property);
      res.send(result);
    });

    //get agent added properties
    app.get("/agent-properties", verifyToken, async (req, res) => {
      try {
        let query = {};
        if (req.query?.email) {
          query = { email: req.query.email };
        }
        const result = await agentAddedPropertiesCollection
          .find(query)
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //update property by agent
    app.patch("/agent-properties/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const property = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            /* TODO: set korbo */ propertyImg: property.name,
            category: property.category,
            price: property.price,
            recipe: property.recipe,
            image: property.image,
          },
        };
        const result = await agentAddedPropertiesCollection.updateOne(
          filter,
          updatedDoc
        );
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //delete property by agent
    app.delete("/agent-properties/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await agentAddedPropertiesCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get offer properties for agent
    app.get("/offer-properties/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const query = { agentEmail: email };
        const result = await offerPropertiesCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //TODO: add sold property route

    /* admin */

    //advertise properties

    //all agents added properties
    app.get("/all-agent-properties", verifyToken, async (req, res) => {
      try {
        const result = await agentAddedPropertiesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // verify and add to all properties
    app.put(
      "/verify-agent-property/:propertyId",
      verifyToken,
      async (req, res) => {
        try {
          const propertyId = req.params.propertyId;

          const updateResult = await agentAddedPropertiesCollection.updateOne(
            { _id: ObjectId(propertyId) },
            { $set: { status: "verified" } }
          );

          if (updateResult.modifiedCount > 0) {
            const agentProperty = await agentAddedPropertiesCollection.findOne({
              _id: ObjectId(propertyId),
            });

            const insertResult = await propertiesCollection.insertOne(
              agentProperty
            );

            res.send(insertResult);
          } else {
            res.status(404).send("Property not found");
          }
        } catch (error) {
          console.error(error);
        }
      }
    );

    // reject properties
    app.put(
      "/reject-agent-property/:propertyId",
      verifyToken,
      async (req, res) => {
        try {
          const propertyId = req.params.propertyId;

          const updateResult = await agentAddedPropertiesCollection.updateOne(
            { _id: ObjectId(propertyId) },
            { $set: { status: "rejected" } }
          );
        } catch (error) {
          console.error(error);
        }
      }
    );

    //get role
    app.get("/user-role/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await usersCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get users
    app.get("/users", verifyToken, async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //make admin
    app.patch("/users/admin/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //make agent
    app.patch("/users/admin/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "agent",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //make fraud
    app.patch("/users/admin/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "fraud",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //delete users
    app.delete("/users/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    //all reviews
    app.get("/all-reviews", verifyToken, async (req, res) => {
      try {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //delete reviews
    app.delete("/all-reviews/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
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
