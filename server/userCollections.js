const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('collections.sqlite')

db.run('CREATE TABLE IF NOT EXISTS collections (userID UUID, collectionID INTEGER, collectionJSON TEXT);')

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

export async function collectionExists(userID, collectionID){
    if(isNaN(collectionID)){ return false; }

    let results = await dbGet(`SELECT * FROM collections WHERE userID = '${userID}' AND collectionID = ${collectionID}`);

    return !results || results.length != 0;
}

export async function appendNewCollection(userID, collectionObject){
    let collection = JSON.stringify(collectionObject);

    let maxCollectionID = (await dbGet(`SELECT MAX(collectionID) FROM collections WHERE userID = '${userID}';`))[0]['MAX(collectionID)'];

    let nextCollectionID = (maxCollectionID != null) ? maxCollectionID + 1 : 0;

    db.run(`INSERT INTO collections (userID, collectionID, collectionJSON) VALUES (?, ?, ?);`, [userID, nextCollectionID, collection]);

    return nextCollectionID;
}

export async function getCollection(userID, collectionID){
    let results = await dbGet(`SELECT * FROM collections WHERE userID = '${userID}' AND collectionID = ${collectionID}`);

    if(!results || results.length == 0){ return null; }

    let collection = JSON.parse(results[0].collectionJSON);

    return collection;
}

export async function getCollectionList(userID){
    let results = await dbGet(`SELECT * FROM collections WHERE userID = '${userID}'`);

    if(!results || results.length == 0){ return null; }

    let list = [];

    results.forEach(row => {
        let collection = JSON.parse(row.collectionJSON);
        list.push({id: row.collectionID, collection: collection});
    });

    return list;
}

export async function setCollection(userID, collectionID, collectionObject){
    let collection = JSON.stringify(collectionObject);

    if(!await collectionExists(userID, collectionID)){
        return false;
    }

    db.run(
        `
        UPDATE collections
        SET collectionJSON = '${collection}'
        WHERE userID = '${userID}' AND collectionID = ${collectionID}
        `
    );

    return true;
}
