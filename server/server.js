/* eslint-env node */
const express = require('express');
const path = require('path');
// const dataRoute = require('./routes/data');
// const shapeRoute = require('./routes/shape');
const joinRoute = require('./routes/join');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// app.use('/data/json', dataRoute);
// app.use('/data/shape', shapeRoute);
app.use('/data/join', joinRoute);

app.listen(port, () => console.log('Listening on :' + port));
