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

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// CONNECT WITH MONGODB

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2xoju.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    client.connect();
    const database = client.db(`${process.env.DB_NAME}`);
    const productCollection = database.collection('courses');
    const reviewCollection = database.collection('reviews');
    const orderCollection = database.collection('orders');
    const userCollection = database.collection('users');
  } finally {
    // client.close()
  }
}
run().catch(console.dir);

app.get('/', (req, res) => res.send('Welcome to pathshala Server API'));
app.listen(port, () => console.log(`Server Running on localhost:${port}`));
