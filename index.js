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

    //update users
    app.patch("/users/:id", async (req, res) => {
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
    app.get("/properties", async (req, res) => {
      try {
        const verifiedProperties = await propertiesCollection
          .find({
            status: "verified",
          })
          .toArray();

        res.send(verifiedProperties);
      } catch (error) {
        console.log(error);
      }
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
        review.date = Date.now();
        const result = await reviewsCollection.insertOne(review);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get reviews
    app.get("/reviews", async (req, res) => {
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
    app.delete("/reviews/:id", async (req, res) => {
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
    app.post("/wishlists", async (req, res) => {
      try {
        const wishlist = req.body;
        const result = await wishlistCollection.insertOne(wishlist);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get wishlist properties
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

    //delete wishlist property
    app.delete("/wishlists/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await propertiesCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //offer for property
    app.post("/offer-properties", async (req, res) => {
      try {
        const property = req.body;
        property.date = Date.now();
        property.status = "pending";
        const result = await offerPropertiesCollection.insertOne(property);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get offer properties for users
    app.get("/offer-properties-by-buyer-email", async (req, res) => {
      try {
        const buyerEmail = req.query.buyerEmail;
        const properties = await offerPropertiesCollection
          .find({
            buyerEmail: buyerEmail,
          })
          .toArray();

        res.send(properties);
      } catch (error) {
        console.log(error);
      }
    });

    //add properties for agent
    app.post("/agent-properties", async (req, res) => {
      const property = req.body;
      property.status = "pending";
      const result = await agentAddedPropertiesCollection.insertOne(property);
      res.send(result);
    });

    //get agent added properties
    app.get("/agent-properties", async (req, res) => {
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
    app.patch("/agent-properties/:id", async (req, res) => {
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
    app.delete("/agent-properties/:id", async (req, res) => {
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
    app.get("/offer-properties", async (req, res) => {
      try {
        let query = {};
        if (req.query?.email) {
          query = { email: req.query.email };
        }
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
    app.get("/all-agent-properties", async (req, res) => {
      try {
        const result = await agentAddedPropertiesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // verify and add to all properties
    app.put("/verify-agent-property/:propertyId", async (req, res) => {
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
    });

    // reject properties
    app.put("/reject-agent-property/:propertyId", async (req, res) => {
      try {
        const propertyId = req.params.propertyId;

        const updateResult = await agentAddedPropertiesCollection.updateOne(
          { _id: ObjectId(propertyId) },
          { $set: { status: "rejected" } }
        );
      } catch (error) {
        console.error(error);
      }
    });

    //get users
    app.get("/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //make admin
    app.patch("/users/admin/:id", async (req, res) => {
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
    app.patch("/users/admin/:id", async (req, res) => {
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
    app.patch("/users/admin/:id", async (req, res) => {
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
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    //all reviews
    app.get("/all-reviews", async (req, res) => {
      try {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //delete reviews
    app.delete("/all-reviews/:id", async (req, res) => {
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
