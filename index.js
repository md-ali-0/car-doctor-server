const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

app.use(
    cors({
        origin: ['http://localhost:5173'],
        credentials: true,
    }),
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.daanzm4.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

app.post('/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '1h' });
    res.cookie('token', token, {
        httpOnly: true,
        secure: false,
    })
        .send({ massage: 'success' })
        .status(200);
});

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token
    if (!token) {
        res.send('unAuthorize Access').status(401)
    }
    const decode = await jwt.verify(token, process.env.SECRET_KEY)
    if (decode) {
        req.user = decode
        next()
    }else{
        res.send('unAuthorize Access').status(401)
    }
};

const servicesCollection = client
    .db('carDoctorDB')
    .collection('servicesCollection');
const checkoutCollection = client
    .db('carDoctorDB')
    .collection('checkoutCollection');

app.get('/', (req, res) => {
    res.send('Server is Running');
});

app.get('/services', async (req, res) => {
    const result = await servicesCollection.find().toArray();
    res.send(result);
});
app.get('/services/:id', async (req, res) => {
    const id = req.params.id;
    const query = {
        _id: new ObjectId(id),
    };
    const options = {
        projection: {
            title: 1,
            img: 1,
            price: 1,
        },
    };
    const result = await servicesCollection.findOne(query, options);
    res.send(result);
});
app.post('/add-service', verifyToken, async (req, res) => {
    const newService = req.body;
    if (req.body.email !== req.user.email) {
        return res.status(403).send('forbiden access')
    }
    const values = {
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email,
        img: req.body.img,
        service: req.body.service,
        price: req.body.price,
        status: req.body.status,
    };
    const result = await checkoutCollection.insertOne(values);
    res.send(result);
});
app.get('/checkout', verifyToken, async (req, res) => {
    let query = {};
    if (req.query?.email) {
        query = { email: req.query.email };
    }
    if (req.query.email !== req.user.email) {
        return res.status(403).send('forbiden access')
    }
    const result = await checkoutCollection.find(query).toArray();
    res.send(result);
});
app.delete('/checkout/:id', async (req, res) => {
    const id = req.params.id;
    const filter = {
        _id: new ObjectId(id),
    };
    const result = await checkoutCollection.deleteOne(filter);
    res.send(result);
});
app.patch('/checkout/:id', async (req, res) => {
    const id = req.params.id;
    const data = req.body;
    const filter = {
        _id: new ObjectId(id),
    };

    const value = {
        $set: {
            status: data.status,
        },
    };

    const result = await checkoutCollection.updateOne(filter, value);
    res.send(result);
});

app.listen(port, () => {
    console.log(`Listing Port ${port}`);
});
