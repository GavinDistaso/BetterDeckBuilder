const transformers = require('@huggingface/transformers');

const sqlite3 = require('sqlite3');

var db = new sqlite3.Database("mtgImgEmbed.sqlite")

let columns = [];
let columnsName = [];

for(let i = 0; i < 512; i++){
    columns.push(`d_${i} REAL`)
    columnsName.push(`d_${i}`)
}

let colText = columns.join(', ')
let colNameText = columnsName.join(', ')

//
const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream("AllPrintings.sqlite");
const request = https.get("https://betterdeckbuilder.gavindistaso.com/AllPrintings.sqlite", function(response) {
    response.pipe(file)

    response.on('end', ()=>{
        updateEmbeddingsDB(20000);
    })
});
//

function dbGet(query){
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            db.all(query, function (err, tables) {
                resolve(tables);
            });
        });
    })
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function L2Normalize(data) {
    const norm = Math.sqrt(data.reduce((sum, val) => sum + val * val, 0));
    if (norm == 0) return data;
    return data.map(val => val / norm);
}

async function updateEmbeddingsDB(max_count = 100){
    console.log("HI!1")

    const model_id = 'Xenova/clip-vit-base-patch32';

    processor = await transformers.AutoProcessor.from_pretrained(model_id);

    console.log("HI!2")

    model = await transformers.CLIPVisionModelWithProjection.from_pretrained(model_id, {
        quantized: true,
    });

    console.log("END")

    db.run(`CREATE TABLE IF NOT EXISTS embeddings (cardUUID UUID, ${colText})`)
    db.run(`ATTACH DATABASE 'AllPrintings.sqlite' AS data`)

    let results = await dbGet( `
        SELECT * FROM data
        WHERE uuid NOT IN (SELECT cardUUID FROM embeddings)
        ORDER BY releaseDate DESC
        LIMIT ${max_count}
        `)

    let cards = [];

    for(let i = 0; i < results.length; i++){
        let card = results[i]
        if(card.side == 'b' && (card.layout == 'transform' || card.layout == 'convert' || card.layout == 'modal_dfc' )){
            card.image = card.image.replace('[side]', 'back');
        }else{
            card.image = card.image.replace('[side]', 'front');
        }

        try{
            let image = await transformers.RawImage.fromURL(card.image);

            let inputs = await processor(image)
            let out = await model({...inputs});
            let embedding = L2Normalize(Array.from(out.image_embeds.data));

            cards.push({UUID: card.uuid, embedding: embedding});

            db.run(`INSERT INTO embeddings (cardUUID, ${colNameText}) VALUES ('${card.uuid}', ${embedding.join(', ')})`)

            console.log(`${i + 1} / ${results.length}`)

        } catch(e){

        }
        await delay(100);
    }

    return cards;
}
