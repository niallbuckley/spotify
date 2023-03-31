const fs = require('fs');
const path = require('path');
const redis = require('redis');

var querystring = require('querystring');
var stateKey = 'spotify_auth_state';

var redirect_uri = process.env.SPOTIFY_REDIRECT_URI; // Your redirect uri
var client_id = process.env.SPOTIFY_CLIENT_ID; // Your client id
var client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your secret

var request = require('request'); // "Request" library

// Define file path to database
const filePath = path.join(__dirname, './../database.json');

const modeChoiceView = (req, res) => {
    console.time();
    var code = req.query.code || null;
    var state = req.query.state || null;
    var stateInDatabase = false;
    // checking if the request has cookies, if it does, what it checks for the auth state if it can't find either return null.
    var storedState = req.cookies ? req.cookies[stateKey] : null;


    // Read the existing data from the database
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return;
      }

      let jsonData = JSON.parse(data);

      // Check if the key exists in the JSON data
      if (jsonData.hasOwnProperty(storedState)) {
        stateInDatabase = true;
      }

      if ((state === null || state !== storedState) === true && stateInDatabase === false) {
        console.log("REDIRECT");
        res.redirect('/#' +
           querystring.stringify({
              error: 'state_mismatch'
           }));
      }
      else {
        // create a Redis client with existing instance details
        const client = redis.createClient({
          host: '127.0.0.1',
          port: '6379'
        });
  
        // Check if the key exists in the JSON data
        if (jsonData.hasOwnProperty(state)) {
          console.log('The key already exists in the JSON data.');
        }
        else{
          // If the key does not exist, add it to the database Along with spotify display name
          
          var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
              code: code,
              grant_type: 'authorization_code',
              redirect_uri: redirect_uri
            },
            headers: {
              'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
          };
        
          request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {
          
              var access_token = body.access_token;

              var options = {
                url: 'https://api.spotify.com/v1/me',
                headers: { 'Authorization': 'Bearer ' + access_token },
                json: true
              };
              // use the access token to access the Spotify Web API
              request.get(options, function(error, response, body) {
                    // spotify id, spotify display name, and spotify access token in the database
                    jData = {"spot_user_name": body.display_name, "spot_a_t": access_token, "spot_id": body.id };

                    (async () => {
                      client.on("error", (error) => console.error(`Error : ${error}`));
                    
                      await client.connect();
                      // Set the auth key as the key for the personal database
                      await client.hSet('users', state, JSON.stringify(jData));
                      console.timeEnd();
                    })();
                })
            }
            else{  console.log("ERROR ",response.body) }
          })
        }
        // This is looking at views diretory 
        res.render("mode", {
        }); 
      }
    });
}

module.exports = modeChoiceView;
