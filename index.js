const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// USE MIDDLEWARE

app.use(cors());
app.use(express.json());

// FIREBASE Service Account

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// CONNECT WITH MONGODB

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2xoju.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyJwtToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const jwt = req.headers.authorization.split(' ')[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(jwt);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }

  next();
}

async function run() {
  try {
    client.connect();
    const database = client.db(`${process.env.DB_NAME}`);
    const assignmentCollection = database.collection('assignments');
    const courseCollection = database.collection('courses');
    const reviewCollection = database.collection('reviews');
    const orderCollection = database.collection('orders');
    const userCollection = database.collection('users');

    /* 
    
                                                   GET APIS
    
    */

    // GET ADMIN OR NOT?

    app.get('/user', verifyJwtToken, async (req, res) => {
      if (req.decodedEmail) {
        const user = await userCollection.findOne({ email: req.query.email });
        let isAdmin = false;
        if (user?.role === 'Admin') {
          isAdmin = true;
        }
        res.json({ admin: isAdmin });
      } else {
        res.status(401).json({ message: 'You do not have access to see Who is the admin of this website..' });
      }
    });

    // GET ALL COURSES

    app.get('/all-courses', async (req, res) => {
      const cursor = courseCollection.find({});
      const courses = await cursor.toArray();
      res.json(courses);
    });

    // GET ALL ASSIGNMENTS

    app.get('/all-assignments', async (req, res) => {
      const cursor = assignmentCollection.find({});
      const assignments = await cursor.toArray();
      res.json(assignments);
    });

    // GET A SINGLE COURSE

    app.get('/course/:id', async (req, res) => {
      const query = { _id: ObjectId(req.params.id) };
      const course = await courseCollection.findOne(query);
      res.json(course);
    });

    // GET SINGLE USERS

    app.get('/users', verifyJwtToken, async (req, res) => {
      if (req.decodedEmail) {
        const cursor = await userCollection.findOne({ email: req.query.email });
        res.json(cursor);
      } else {
        res.status(401).json({ message: 'You do not have access to see user Information' });
      }
    });

    // GET MY ORDERS

    app.get('/orders', verifyJwtToken, async (req, res) => {
      if (req.decodedEmail) {
        const cursor = await orderCollection.find({ 'billing_details.email': req.query.email });
        const orders = await cursor.toArray();
        res.json(orders);
      } else {
        res.status(401).json({ message: 'You do not have access to see orders' });
      }
    });

    app.get('/all-users', async (req, res) => {
      const cursor = userCollection.find({ position: req.query.position });
      const users = await cursor.toArray();
      res.json(users);
    });

    /* 
    
                                                   POST APIS
    
    */

    // POST A SINGLE USER

    app.post('/user', async (req, res) => {
      const result = await userCollection.insertOne(req.body);
      res.json(result);
    });

    // POST A SINGLE COURSE

    app.post('/add-course', async (req, res) => {
      const result = await courseCollection.insertOne(req.body);
      res.json(result);
    });

    // POST A SINGLE ASSIGNMENT

    app.post('/add-assignment', async (req, res) => {
      const result = await assignmentCollection.insertOne(req.body);
      res.json(result);
    });

    // POST A SINGLE ORDER

    app.post('/add-order', async (req, res) => {
      const result = await orderCollection.insertOne(req.body);
      res.json(result);
    });

    app.post('/create-payment-intent', async (req, res) => {
      const paymentInfo = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: paymentInfo.price * 100,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    /* 
    
                                                   DELETE APIS
    
    */

    /* 
    
                                                   UPDATE APIS
    
    */

    app.put('/edit-profile', async (req, res) => {
      const { birthDate, description, address, motherName, fatherName, fullName, phNumber } = req.body;
      const filter = { email: req.query.email };
      const updatingProfile = {
        $set: { birthDate, description, address, fatherName, motherName, fullName, phNumber },
      };
      const result = userCollection.updateOne(filter, updatingProfile);
      res.json(result);
    });

    // PUT admin & check with JWT Token  he/she is admin or not ?

    app.put('/user/admin', verifyJwtToken, async (req, res) => {
      const newAdmin = req.body;
      const email = req.decodedEmail;
      if (email) {
        const requester = await userCollection.findOne({ email });
        if (requester.role === 'Admin') {
          const filter = { email: newAdmin.email };
          const updateUser = { $set: { role: 'Admin' } };
          const result = await userCollection.updateOne(filter, updateUser);
          res.json(result);
        }
      } else {
        res.status(401).json({ message: 'You do not have access to make admin' });
      }
    });
  } finally {
    // client.close()
  }
}
run().catch(console.dir);

app.get('/', (req, res) => res.send('Welcome to Child Dreamland Server API'));
app.listen(port, () => console.log(`Server Running on localhost:${port}`));
