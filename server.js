global.Promise = require('bluebird');
const cors = require('cors');
const next = require('next');
const Pusher = require('pusher');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const Sentiment = require('sentiment');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

const app = next({ dev });
const handler = app.getRequestHandler();
const sentiment = new Sentiment();

// creating pusher instance
const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_APP_KEY,
    secret: process.env.PUSHER_APP_SECRET,
    cluster: process.env.PUSHER_APP_CLUSTER,
    encrypted: true
});

try {

    ( async function() {
        await app.prepare();
        const server = express();

        server.use( cors() );
        server.use( bodyParser.json() );
        server.use( bodyParser.urlencoded({ extended: true }));

        const chatHistory = { messages: [] };

        server.post('/message', ( req, res ) => {
            try {
                const { user = null, message = '', timestamp = +new Date } = req.body;
                const sentimentScore = sentiment.analyze(message).score;

                const chat = { user, message, timestamp, sentiment: sentimentScore };

                chatHistory.messages.push(chat);
                pusher.trigger('chat-room', 'new-message', { chat });

            } catch( err ) {
                res.status(500).send({ message: err.message })
            }

        });

        server.post('/messages', (req, res ) => {
            res.json({ ...chatHistory, status: 'success' });
            res.send()
        });

        server.get('*', (req, res) => {
            return handler(req, res);
        });

        server.listen( port, err => {
            if(err) throw err;
            console.log(`> Ready on http://localhost:${port}`);
        })

    })();

} catch( err ) {
    console.log( err.stack );
    process.exit(1);
}