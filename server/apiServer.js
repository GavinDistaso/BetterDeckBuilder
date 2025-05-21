const jwt = require('./jwt.js')
const userDB = require('./usersDatabase.js')
const collectionDB = require('./userCollections.js')

const https = require('https');
const fs = require('fs');

require('dotenv').config();

const port = 8443;

// 1 hour experation time
const bearerExperiationTime = 1 * 60 * 60 * 1000;

const sslCertFile = process.env.SSL_CERT;
const sslKeyFile = process.env.SSL_KEY;

var sslCert = 'Cert';
var sslKey = 'Key';

try{
    sslCert = fs.readFileSync(sslCertFile);
    sslKey = fs.readFileSync(sslKeyFile);
} catch{
    console.error('SSL Cert and Key not provided, resulting server will be hosted as http on localhost.')
}

//

function writeApiResponse(res, payloadObj, success, statusCode, errMessage){
    res.writeHead(statusCode);

    let obj = {
        payload: payloadObj,
        success: !!success,
        errMessage: errMessage
    };

    res.write(JSON.stringify(obj));
}

function readRequestBody(req){
    return new Promise((res, rej)=>{
        let body = '';

        req.on('readable', () => {
            let chunk = req.read();

            if(chunk == null || chunk.length == 0 || (chunk.length == 0 && chunk.charCodeAt(0) == 0)){
                return;
            }
            body += chunk;
        })

        req.on('end', () => {
            res(body);
        })
    })
}

https.createServer({ sslCert, sslKey }, async (req, res) => {
    let url = new URL('https://thisApi.com' + req.url);

    let body = await readRequestBody(req);

    //

    let pathName = url.pathname.toLowerCase().replaceAll('//', '/');

    if(pathName[pathName.length - 1] == '/'){
        pathName = pathName.slice(0, -1)
    }

    //

    res.setHeader('Content-Type', 'application/json')

    if(['https://betterdeckbuilder.gavindistaso.com', 'https://bdbapi.gavindistaso.com', 'http://127.0.0.1:8080'].includes(req.headers.origin)){
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    }
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, *');
    res.setHeader('Access-Control-Allow-Credentials', true);

    if(req.method == 'OPTIONS'){
        writeApiResponse(res, {}, true, 200, 'OPTIONS passthrough.')
        res.end();
        return;
    }
    //

    let bearerToken = null;
    let bearerData = null;

    if(req.headers['authorization']){
        let [type, token] = req.headers['authorization'].split(' ').slice(0, 2);

        if(type == 'Bearer'){
            bearerToken = token;
        }
    }

    if(bearerToken != null){
        let [verified, tokenData] = jwt.decodeAndValidateWebToken(bearerToken);

        let isExpired = Date.now() > (tokenData.issuedAt + bearerExperiationTime);

        if(!verified){
            writeApiResponse(res, {}, false, 401, "The supplied bearer token is invalid.")
            res.end();
            return;
        }
        else if(isExpired){
            writeApiResponse(res, {}, false, 401, "The supplied bearer token has timed out.")
            res.end();
            return;
        }

        bearerData = tokenData;
    }

    let bearerCheck = () => {
        if(bearerToken == null || !bearerToken){
            writeApiResponse(res, {}, false, 401, "This action requires a valid bearer token.")
            return false;
        }

        return true;
    }

    //

    switch(pathName){
        case '/signup': {
            let email = req.headers['credentials-email'];
            let password = req.headers['credentials-password'];
            let username = req.headers['credentials-username'];

            if(!email || !password || !username){
                writeApiResponse(res, {}, false, 400, "User email, password, or username were not provided.")
                break;
            }

            let [status, message] = await userDB.newUser(username, email, password);

            if(!status){
                writeApiResponse(res, {}, false, 400, message);
                break;
            }

            writeApiResponse(res, {}, true, 201, message);
        } break;
        case '/auth': {
            let email = req.headers['credentials-email'];
            let password = req.headers['credentials-password'];

            if(!email || !password){
                writeApiResponse(res, {}, false, 400, "User email and/or password were not provided.")
                break;
            }

            let userInfo = await userDB.userLogin(email, password);

            if(userInfo == null){
                writeApiResponse(res, {}, false, 401, "Provided email or password were incorrect.")
                break;
            }

            // Login success!!

            let token = new jwt.WebToken({
                'user' : userInfo.userID,
                'issued' : Date.now(),
                'perm' : userInfo.permissionLevel
            })

            let bearer = token.signAndCreate();

            writeApiResponse(res, {
                bearerToken: bearer,
                issued: token.issuedAt,
                expiresAt: token.issuedAt + bearerExperiationTime,
                userID: token.userID,
                permissionLevel: token.permissionLevel
            }, true, 200, "Bearer token sucessfully created.");
        } break;
        case '/userinfo': {
            if(!bearerCheck()){ break; }

            let userID = bearerData.userID;

            let userData = await userDB.getUserData(userID);

            writeApiResponse(res, {
                userID: userData.userID,
                userEmail: userData.userEmail,
                userName: userData.userName,
                permissionLevel: userData.permissionLevel
            }, true, 200, "Success");
        } break;
        case '/collection': {
            if(!bearerCheck()){ break; }

            let userID = bearerData.userID;

            let method = req.method;

            if(method != 'GET' && method != 'PUT' && method != 'POST'){
                writeApiResponse(res, {}, false, 400, "Method must be GET or PUT");
                break;
            }

            if(method == 'POST'){
                let collection = JSON.parse(body);

                let collectionID = await collectionDB.appendNewCollection(userID, collection);
                writeApiResponse(res, {collectionID: collectionID}, true, 201, "Collection successfully created.");
            } else{
                if(!url.searchParams.has('collectionID')){
                    writeApiResponse(res, {}, false, 400, "'collectionID' not specified. Input 'LIST' to recive a collection list if using GET method.");
                    break;
                }

                let collectionID = url.searchParams.get('collectionID');

                if(method == 'GET'){
                    if(collectionID == 'LIST'){
                        let list = await collectionDB.getCollectionList(userID);

                        writeApiResponse(res, list, true, 200, "Collection list recived.");
                    }
                    else{
                        let collection = await collectionDB.getCollection(userID, parseInt(collectionID))

                        if(!collection){
                            writeApiResponse(res, {}, false, 403, "Either collectionID is invalid or not accesable by this user.");
                        } else{
                            writeApiResponse(res, collection, true, 200, "Collection recived.");
                        }
                    }
                } else if(method == 'PUT'){
                    let collection = JSON.parse(body);

                    let success = await collectionDB.setCollection(userID, parseInt(collectionID), collection);

                    if(!success){
                        writeApiResponse(res, {}, false, 403, "Either collectionID is invalid or not accesable by this user.");
                    } else{
                        writeApiResponse(res, {}, true, 200, "Collection updated.");
                    }
                }
            }

        } break;
        default: {
            writeApiResponse(res, {}, false, 404, "Endpoint not found.");
        } break;
    }

    res.end();
}).listen(port);
