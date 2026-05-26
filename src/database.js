const sqlPromise = initSqlJs({
    locateFile: filename => `./dist/${filename}`
});

const databasePromise = 
    fetch(
        'https://betterdeckbuilder.gavindistaso.com/AllPrintings.sqlite',
        {cache: 'no-cache'}
    );

const embedDatabasePromise = 
    fetch(
        'https://betterdeckbuilder.gavindistaso.com/mtgImgEmbed.sqlite ',
        {cache: 'no-cache'}
    );

async function run(){
    const [SQL, buf, pHashBuf] = await Promise.all([sqlPromise, databasePromise, embedDatabasePromise]);

    let data = await buf.arrayBuffer();

    const db = new SQL.Database(new Uint8Array(data));
    //
    //

    let pHashData = await pHashBuf.arrayBuffer();

    const embedDB = new SQL.Database(new Uint8Array(pHashData))

    //

    document.getElementById('loading').style.display = 'none';

    return [db, embedDB];
}


let db = null;
let embedDB = null;

(async() => {
    [db, embedDB] = await run();
    await populateEmbeddingList();
})();


async function searchDB(
    text,
    textType='name',
    orderBy='name',
    orderAscending=true,
    customConditions=[],
    pageIndex=0,
    pageSize=20
){
    let column = textType;

    let conditions = '';

    customConditions.forEach((item) => {
        conditions += `AND (${item})`;
    });

    let results = await db.exec(
        `
        SELECT * from (
            SELECT *,
                ROW_NUMBER() OVER (
                    PARTITION BY name
                    ORDER BY ${orderBy} COLLATE NOCASE 
                        ${orderAscending ? 'ASC' : 'DESC'}
                        NULLS LAST
                ) rn

            FROM data 

            WHERE 
                ${column} LIKE '%${text.replaceAll("'", "''")}%' 
                ${conditions}
        ) a

        WHERE rn = 1

        ORDER BY ${orderBy} COLLATE NOCASE 
            ${orderAscending ? 'ASC' : 'DESC'}
            NULLS LASThttps://unpkg.com/hnswlib-wasm@0.8.2/dist/hnswlib.mjs

        LIMIT ${pageIndex * pageSize}, ${pageSize}
        `
    );

    if(results.length == 0)
        return [];

    let cards = [];

    results[0].values.forEach(async element => {
        cards.push(await initCard(db, element, results[0].columns));
    });

    return [cards, pageIndex * pageSize + 1, (pageIndex + 1) * pageSize, 0];
}

async function findCard(name, setCode = null, orderBy = null){
    if(!name || name.length <= 0) 
        return null;

    let results = await db.exec(
        `
        SELECT * FROM data 

        WHERE name = '${name.replaceAll("'", "''")}' 
        ${setCode ? `AND setCode = '${setCode}'` : ''}

        ${orderBy ? `ORDER BY ${orderBy} COLLATE NOCASE ASC NULLS LAST` : ''}

        limit 1
        `
    );

    if(results.length == 0)
        return null;

    return await initCard(db, results[0].values[0], results[0].columns);
}

async function getCardByUUID(uuid){
    let results = await db.exec(
        `
        SELECT * FROM data
        WHERE uuid = '${uuid}'
        LIMIT 1
        `
    );

    if(results.length == 0)
        return null;

    return await initCard(db, results[0].values[0], results[0].columns);
}

//

function L2Normalize(data) {
    const norm = Math.sqrt(data.reduce((sum, val) => sum + val * val, 0));
    if (norm == 0) return data;
    return data.map(val => val / norm);
}

let embedColNames = []

for(let i = 0; i < 512; i++){
    embedColNames.push(`d_${i}`)
}

let embeddingList = [];
let uuidList = [];

async function populateEmbeddingList(){
    let results = await embedDB.exec(
        `
        SELECT *
        FROM embeddings
        `
    )

    let i = 0;
    for (const [uuid, ...embedding] of results[0].values) {
        embeddingList[i] = new Float32Array(embedding);
        uuidList[i] = uuid
        i++;
    }
}

function dot(a, b){
    let d = 0;
    for(let i = 0; i < 512; i++){
        d+= a[i] * b[i]
    }
    return d;
}

async function findClosestEmbeddding(embeddingVector){
    let embedding = new Float32Array(L2Normalize(embeddingVector));

    let minimalIndex = 0;
    let maxDot = -2;

    for(let i = 0; i < embeddingList.length; i++){
        let d = dot(embedding, embeddingList[i])

        if(d > maxDot){
            maxDot = d;
            minimalIndex = i;
        }
    }

    return [{card: await getCardByUUID(uuidList[minimalIndex]), dotProduct: maxDot}];
    /*

    let cardResults = [];

    for(let i = 0; i < results[0].values.length; i++){
        cardResults.push({card: await getCardByUUID(results[0].values[i][0]), dotProduct: results[0].values[i][1]})
    }

    return cardResults
    */
}
