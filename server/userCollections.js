const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('collections.sqlite')

db.run('CREATE TABLE IF NOT EXISTS collections (userID UUID, collectionName VARCHAR(30), collectionJSON TEXT);')

export function closeDB(){
    db.close();
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

export async function collectionExists(userID, collectionName){
    let results = await dbGet(`SELECT * FROM collections WHERE userID = '${userID}' AND collectionName = '${collectionName}'`);

    return !results || results.length != 0;
}

export async function appendNewCollection(userID, collectionName, collectionObject){
    let collection = JSON.stringify(collectionObject);

    if(await collectionExists(userID, collectionName)){ return false; }

    db.run(`INSERT INTO collections (userID, collectionName, collectionJSON) VALUES ('${userID}', '${collectionName}', '${collection}');`);

    return true;
}

export async function getCollection(userID, collectionName){
    let results = await dbGet(`SELECT * FROM collections WHERE userID = '${userID}' AND collectionName = '${collectionName}'`);

    if(!results || results.length == 0){ return null; }

    let collection = JSON.parse(results[0].collectionJSON);

    return collection;
}

export async function getCollectionList(userID){
    let results = await dbGet(`SELECT * FROM collections WHERE userID = '${userID}'`);

    if(!results || results.length == 0){ return []; }

    let list = [];

    results.forEach(row => {
        let collection = JSON.parse(row.collectionJSON);
        list.push({name: row.collectionName, collection: collection});
    });

    return list;
}

export async function setCollection(userID, collectionName, collectionObject){
    let collection = JSON.stringify(collectionObject);

    if(!await collectionExists(userID, collectionName)){
        return false;
    }

    db.run(
        `
        UPDATE collections
        SET collectionJSON = '${collection}'
        WHERE userID = '${userID}' AND collectionName = '${collectionName}'
        `
    );

    return true;
}
