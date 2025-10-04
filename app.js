const express = require('express');
const helmet = require('helmet');
const cors =   require('cors');
const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');

const app = express();

//req id
app.use((req,res, next) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader(`x-request-id : ${req.id}`);
    nextTick();
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());

//health
app.get('/health', (req,res) => {
    res.json({ok: true});
});

//error handler
app.use((req,res) => res.status(404).json({error: 'route_not_found'}));
app.use((err, req, res, next) => {
    req.log ? req.log.error(err) : console.error(err);
    const status = err.status || 500
    const message = status === 500 & process.env.NODE_ENV === 'production' 
    ? 'Internal Error'
    : err.message || 'Server error';
    res.status(status).json({error: status === 500 ? 'server error' : 'error', message});
})

module.exports = app;
