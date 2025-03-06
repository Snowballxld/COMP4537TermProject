const fs = require("fs");
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

let db;
async function initMongoDB() {
    const client = new MongoClient(mongoUri);
    try {
        await client.connect();
        db = client.db('COMP4537TermProject');
        console.log('Connected to MongoDB!');
    } catch (err) {
        console.error("Connection error:", err);
        process.exit(1);
    }
}

initMongoDB();


