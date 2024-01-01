const express = require("express");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();

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
    // await client.connect();

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
    const paymentCollection = client.db("realEstate").collection("payments");
    const advertiseCollection = client
      .db("realEstate")
      .collection("advertises");

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
    //use verify agent after verifyToken
    const verifyAgent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      console.log(query);
      const user = await usersCollection.findOne(query);
      const isAgent = user?.role === "agent";
      console.log(isAgent);
      if (!isAgent) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      next();
    };

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

    // get properties
    app.get("/properties", verifyToken, async (req, res) => {
      // console.log("hi---------------->", req.decoded);
      try {
        const page = parseInt(req.query.page);
        const size = parseInt(req.query.size);
        const verifiedProperties = await propertiesCollection
          .find({
            status: "verified",
          })
          .skip(page * size)
          .limit(size)
          .toArray();
        // console.log(verifiedProperties)
        res.send(verifiedProperties);
      } catch (error) {
        console.log(error);
      }
    });

    //properties limit count
    app.get("/properties-count", verifyToken, async (req, res) => {
      const count = await propertiesCollection.estimatedDocumentCount();
      // console.log(count);
      res.send({ count });
    });

    //get properties by name
    app.get("/search-properties/:title", verifyToken, async (req, res) => {
      try {
        const title = req.params.title;
        let query = { title: title };
        console.log(title);
        const result = await propertiesCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/sort-properties", async (req, res) => {
      try {
        const { order, field } = req.query;
        const sortOptions = {};
        if (
          order &&
          (order.toLowerCase() === "asc" || order.toLowerCase() === "desc")
        ) {
          sortOptions[`priceRange.min`] =
            order.toLowerCase() === "asc" ? 1 : -1;
        } else {
          sortOptions["priceRange.min"] = 1;
        }

        const verifiedProperties = await propertiesCollection
          .find({
            status: "verified",
          })
          .sort(sortOptions)
          .toArray();
        res.send(verifiedProperties);
      } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
      }
    });

    //get single properties
    app.get("/properties2/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        console.log("mmmm----------->", query);
        const result = await propertiesCollection.findOne(query);
        console.log(result);
        res.send(result);
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

    //get reviews for home page
    app.get("/reviews-for-home", async (req, res) => {
      try {
        let query = {};
        if (req.query?.email) {
          query = { email: req.query.email };
        }
        const result = await reviewsCollection
          .find(query)
          .sort({ date: -1 })
          .limit(4)
          .toArray();
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
        const result = await reviewsCollection
          .find(query)
          .sort({ date: -1 })
          .toArray();
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
    app.get("/user-wishlists", verifyToken, async (req, res) => {
      try {
        const email = req.query?.email;
        const query = { email: email };
        const page = parseInt(req.query.page);
        const size = parseInt(req.query.size);
        const result = await wishlistCollection
          .find(query)
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/wishlists/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await wishlistCollection.findOne(query);
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

    //get a offer property
    app.get("/offer-properties/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await offerPropertiesCollection.find(query).toArray();
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
          query.agentEmail = req.query.email;
        }
        const result = await agentAddedPropertiesCollection
          .find(query)
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get a agent added properties
    app.get("/agent-properties/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const property = req.body;
        const query = { _id: new ObjectId(id) };
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
            title: property.title,
            location: property.location,
            propertyImg: property.propertyImg,
            agentImg: property.agentImg,
            priceRange: property.priceRange,
            agentName: property.agentName,
            agentEmail: property.agentEmail,
          },
        };
        console.log(updatedDoc);
        const result = await agentAddedPropertiesCollection.updateOne(
          filter,
          updatedDoc
        );
        console.log(result);
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
    app.get("/requested-properties", verifyToken, async (req, res) => {
      try {
        let query = { status: "pending" };

        if (req.query?.email) {
          query.agentEmail = req.query.email;
        }

        console.log(query);

        const result = await offerPropertiesCollection.find(query).toArray();

        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //post advertise properties
    app.post(
      "/advertise-properties",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const property = req.body;
        const result = await advertiseCollection.insertOne(property);
        res.send(result);
      }
    );

    //get advertise properties
    app.get("/advertise-properties", async (req, res) => {
      const result = await advertiseCollection.find().toArray();
      res.send(result);
    });

    // ads status properties
    app.patch("/ads-status/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        // console.log(filter);
        const updatedDoc = {
          $set: {
            adStatus: "advertised",
          },
        };
        // console.log(updatedDoc);
        const result = await propertiesCollection.updateOne(filter, updatedDoc);
        // console.log(result);
        res.send(result);
      } catch (error) {
        console.error(error);
      }
    });
    // ads status properties
    app.delete(
      "/advertise-properties/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { propertyId: id };
          const getProperty = await advertiseCollection.deleteOne(query);

          console.log(getProperty);
          res.send(getProperty);
        } catch (error) {
          console.error(error);
        }
      }
    );

    //todo
    // ads status properties
    app.patch(
      "/remove-status/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const filter = { _id: new ObjectId(id) };
          console.log("i----->", filter);
          const updatedDoc = {
            $set: {
              adStatus: "notAdd",
            },
          };
          console.log("i----->", updatedDoc);
          const result = await propertiesCollection.updateOne(
            filter,
            updatedDoc
          );
          console.log("i----->", result);
          res.send(result);
        } catch (error) {
          console.error(error);
        }
      }
    );

    //all agents added properties
    app.get(
      "/all-agent-properties",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const result = await agentAddedPropertiesCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.log(error);
        }
      }
    );

    //add agent properties to all properties
    app.post("/add-to-properties", verifyToken, async (req, res) => {
      const property = req.body;
      console.log(property);
      const result = await propertiesCollection.insertOne(property);
      console.log(result);
      res.send(result);
    });

    // verify and add to all properties
    app.patch(
      "/verify-agent-property/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const filter = { _id: new ObjectId(id) };
          console.log(filter);
          const updatedDoc = {
            $set: {
              status: "verified",
            },
          };
          console.log(updatedDoc);
          const result = await agentAddedPropertiesCollection.updateOne(
            filter,
            updatedDoc
          );
          console.log(result);
          res.send(result);
        } catch (error) {
          console.error(error);
        }
      }
    );

    // verify and add to all properties
    app.patch(
      "/reject-agent-property/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const filter = { _id: new ObjectId(id) };
          console.log(filter);
          const updatedDoc = {
            $set: {
              status: "rejected",
            },
          };
          console.log(updatedDoc);
          const result = await agentAddedPropertiesCollection.updateOne(
            filter,
            updatedDoc
          );
          console.log(result);
          res.send(result);
        } catch (error) {
          console.error(error);
        }
      }
    );

    //accept request
    app.patch(
      "/accept-requested-property/:id",
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        console.log(filter);
        const updatedDoc = {
          $set: {
            status: "accepted",
          },
        };
        console.log(updatedDoc);
        const result = await offerPropertiesCollection.updateOne(
          filter,
          updatedDoc
        );
        console.log(result);
        res.send(result);
      }
    );

    //reject request
    app.patch(
      "/reject-requested-property/:id",
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        console.log(filter);
        const updatedDoc = {
          $set: {
            status: "rejected",
          },
        };
        console.log(updatedDoc);
        const result = await offerPropertiesCollection.updateOne(
          filter,
          updatedDoc
        );
        console.log(result);
        res.send(result);
      }
    );

    //get agent sold properties
    app.get("/sold-properties", verifyToken, verifyAgent, async (req, res) => {
      try {
        let query = {};
        if (req.query?.email) {
          query.agentEmail = req.query.email;
        }

        console.log(query);
        const result = await paymentCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get role
    app.get("/user-role/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        // console.log(query)
        const result = await usersCollection.find(query).toArray();
        // console.log(result)
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //get users
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //make admin
    app.patch(
      "/users/make-admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    //make agent
    app.put(
      "/users/make-agent/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "agent",
          },
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    //make fraud
    app.patch(
      "/users/mark-fraud/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "fraud",
          },
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    //delete users
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    //all reviews
    app.get("/all-reviews", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //delete reviews
    app.delete(
      "/all-reviews/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await reviewsCollection.deleteOne(query);
        res.send(result);
      }
    );

    //payment intent
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "aaa---->");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //payment related api
    app.post("/payments", verifyToken, async (req, res) => {
      try {
        const payment = req.body;
        const paymentResult = await paymentCollection.insertOne(payment);
        res.send(paymentResult);
      } catch (error) {
        console.log(error);
      }
    });

    app.patch("/brought-property-status/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      console.log(filter);
      const updatedDoc = {
        $set: {
          status: "brought",
        },
      };
      console.log(updatedDoc);
      const result = await offerPropertiesCollection.updateOne(
        filter,
        updatedDoc
      );
      console.log(result);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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

/* fuzzy-school.surge.sh */
/* astonishing-doll.surge.sh */
