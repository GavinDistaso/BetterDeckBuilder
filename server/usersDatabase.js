const sqlite3 = require('sqlite3');
const uuid = require('uuid');
const crypto = require('crypto');
const db = new sqlite3.Database('users.sqlite')

db.run('CREATE TABLE IF NOT EXISTS users (userID UUID, userName VARCHAR(30), userEmail VARCHAR(256), passwordHash VARCHAR(64), permissionLevel SMALLINT);')

export function closeDB(){
    db.close();
}

export const PERMISSION_LEVEL = {
    USER: 0,
    MODERATOR: 1,
    ADMIN: 2
};

function generatePasswordHash(userEmail, password){
    userEmail = userEmail.toLowerCase();

    let hash = crypto.createHash('sha256');

    hash.update(`${userEmail}:${password}`);

    return hash.digest('hex');
}

function dbGet(query){
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            db.all(query, function (err, tables) {
                resolve(tables);
            });
        });
    })
}

export async function userNameOrEmailExists(userName, email){
    userName = userName.toLowerCase();
    email = email.toLowerCase();

    var usernameExists = false;
    var emailExists = false;

    let results = await dbGet(`
        SELECT userName, userEmail FROM users
        WHERE LOWER(userName) = "${userName}" OR LOWER(userEmail) = "${email}"
        LIMIT 1
    `);

    if(results.length != 0){
        usernameExists = results[0].userName == userName;
        emailExists = results[0].userEmail == email;
    }

    return [usernameExists, emailExists];
}

export async function newUser(userName, userEmail, password, permissionLevel = PERMISSION_LEVEL.USER){
    if(userName.length < 4 || userName.length > 30 || /\s/g.test(userName)){
        return [false, "Username must be between 4 and 30 characters with no spaces."]
    }

    userEmail = userEmail.toLowerCase();

    if(userEmail.length < 4 || userEmail.length > 256 || /\s/g.test(userEmail)){
        return [false, "Email must be between 4 and 256 characters with no spaces."]
    }

    if(password.length < 6 || password.length > 256 || /\s/g.test(password)){
        return [false, "Password must be between 6 and 256 characters with no spaces."]
    }

    let [userNameExists, emailExists] = await userNameOrEmailExists(userName, userEmail)
    if(userNameExists){
        return [false, "Username already exists."]
    }
    else if(emailExists){
        return [false, "Email already exists."]
    }
    
    let passwordHash = generatePasswordHash(userEmail, password);
    let userID = uuid.v7();
    
    db.run(`
        INSERT INTO users (userID, userName, userEmail, passwordHash, permissionLevel)
        VALUES ("${userID}", "${userName}", "${userEmail}", "${passwordHash}", ${permissionLevel});
    `)

    return [true, 'User succesfully created.']
}

export async function userLogin(userEmail, password){
    userEmail = userEmail.toLowerCase();
    
    let passwordHash = generatePasswordHash(userEmail, password);

    let results = await dbGet(`
        SELECT * FROM users
        WHERE LOWER(userEmail) = "${userEmail}" AND passwordHash = "${passwordHash}"
    `)

    if(results.length == 0){
        return null;
    }

    return results[0];
}

export async function getUserData(userID){
    let result = await dbGet(`
        SELECT * FROM users
        WHERE userID = "${userID}"
    `)

    return result[0];
}
