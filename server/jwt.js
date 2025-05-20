const crypto = require('crypto');
require('dotenv').config();

const secret = process.env.SERVER_SECRET;

if(secret == undefined || !secret){
    throw new Error("'SERVER_SECRET' enviroment variable not set.");
}

//

function base64UrlEncode(obj) {
    return btoa(JSON.stringify(obj))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
}

function base64UrlDecode(obj) {
    if(!obj){
        return {};
    }

    let base64 = obj.replaceAll('-', '+')
        .replaceAll('/', '_');

    let string = atob(base64);

    return JSON.parse(string);
}

export class WebToken {
    constructor(payloadObject){
        this.userID = payloadObject['user'];
        this.issuedAt = payloadObject['issued'];
        this.permissionLevel = payloadObject['perm'];
    }

    signAndCreate(){
        let header = {
            "alg": "HS256",
            "typ": "JWT"
        };

        let payload = {
            "user": this.userID,
            "issued": this.issuedAt,
            "perm": this.permissionLevel
        };

        let headerMsg =  base64UrlEncode(header)
        let payloadMsg =  base64UrlEncode(payload)

        //

        let message = headerMsg + '.' + payloadMsg;

        let hmac = crypto.createHmac('sha256', secret);
        hmac.update(message)

        let signature = hmac.digest('base64url');

        let token = headerMsg + '.' + payloadMsg + '.' + signature;

        return token;
    }
}

export function decodeAndValidateWebToken(webToken){
    let [headerMsg, payloadMsg, receivedSignature] = webToken.split('.').splice(0, 3);

    //
    
    let message = headerMsg + '.' + payloadMsg;

    let hmac = crypto.createHmac('sha256', secret);
    hmac.update(message)

    let signature = hmac.digest('base64url');

    // 

    let verified = receivedSignature == signature;

    let payload = base64UrlDecode(payloadMsg);

    return [verified, new WebToken(payload)]
}
