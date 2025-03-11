import express from 'express';

const app = express();

// common middleware
app.use(express.json());
app.use(express.urlencoded({ extende: true, limit: "16kb" }));
app.use(cookieParser())
app.use(express.static("public"));


export { app }