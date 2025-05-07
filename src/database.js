const sqlPromise = initSqlJs({
    locateFile: filename => `./dist/${filename}`
});

const databasePromise = 
    fetch(
        'https://betterdeckbuilder.gavindistaso.com/AllPrintings.sqlite',
        {cache: 'no-cache'}
    );
async function run(){
    const [SQL, buf] = await Promise.all([sqlPromise, databasePromise]);

    let data = await buf.arrayBuffer();

    const db = new SQL.Database(new Uint8Array(data));

    document.getElementById('loading').style.display = 'none';

    return db;
}


let db = null;

(async() => {
    db = await run();
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
            NULLS LAST

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
