const express = require('express');
const app = express();
const mongoose = require('mongoose');
const ejs = require('ejs');
const fs = require('fs');
const session = require('client-sessions');
const bodyParser = require('body-parser');
const path = require('path');
var logger = require('morgan');
var dotenv = require('dotenv').config();
const expressLayouts = require('express-ejs-layouts');
const { google } = require('googleapis');
//const OAuth2Data = require(__dirname+'/google_key.json');
let rawdata = fs.readFileSync('g_key.json');
const OAuth2Data = JSON.parse(rawdata);
console.log(OAuth2Data);

const CLIENT_ID = OAuth2Data.client.id;
const CLIENT_SECRET = OAuth2Data.client.secret;
const REDIRECT_URL = OAuth2Data.client.redirect;
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;

const port = process.env.PORT || 3000;

//Middleware for bodyparser
app.use(express.static(__dirname + '/views'));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger('dev'));

//mongoDB configuration
const db = require('./setup/myDBurl').mongoURL;

//Attempt to connect to database
mongoose.
    connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.log(err));

//Set view engine
app.use(expressLayouts);
app.set('view engine', 'ejs');

//Testing the server
app.get('/homepage', (req, res) => {
    res.render('homepage');
});


app.get('/login-page', (req, res)=>{
    res.render('login-page')
});

app.get('/', (req, res) => {
    if (!authed) {
        // Generate an OAuth URL and redirect there
        const url = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/gmail.readonly'
        });
        console.log(url)
        res.redirect(url);
    } else {
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
        gmail.users.getProfile({userId:'me'},(err,res)=>{
            console.log("gstuff : "+JSON.stringify(res.data.emailAddress));
        });
        gmail.users.labels.list({
            userId: 'me',
        }, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            const labels = res.data.labels;
            //console.log('Pre Labels:' + JSON.stringify(labels));
            if (labels.length) {
                /*
                console.log('Labels:');
                labels.forEach((label) => {
                    console.log(`- ${label.name}`);
                });*/
            } else {
                console.log('No labels found.');
            }
        });
        res.send('logged in')
    }
})

app.get('/auth/google/callback', function (req, res) {
    const code = req.query.code
    if (code) {
        // Get an access token based on our OAuth code
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating')
                console.log(err);
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                console.log("Oauth2 : "+JSON.stringify(oAuth2Client));
                authed = true;
                res.redirect('/homepage')
            }
        });
    }
});

//All routes
const auth = require('./routes/api/auth');
const home = require('./routes/api/home');


app.use('/api/auth', auth);
app.use('/api/home', home);

app.listen(port, () => {
    console.log(`Server running at ${port}`);
});