const sqlite3 = require('sqlite3');
var db = new sqlite3.Database('MtgCHashes.sqlite')

export function closeDB(){
    db.close();
}

export function openDB(){
    db = new sqlite3.Database('MtgCHashes.sqlite');
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

const m1  = BigInt("0x5555555555555555");
const m2  = BigInt("0x3333333333333333");
const m4  = BigInt("0x0f0f0f0f0f0f0f0f");
const h01 = BigInt("0x0101010101010101");
const u64m = BigInt("0xFFFFFFFFFFFFFFFF");

// note, this assumes each hash is 64 bits long
// https://en.wikipedia.org/wiki/Hamming_weight#Efficient_implementation
function hammingDistance(A, B){
    let x = A ^ B;

    x -= (x >> 1n) & m1;
    x = (x & m2) + ((x >> 2n) & m2);
    x = (x + (x >> 4n)) & m4;
    return ((x * h01) & u64m) >> 56n; // 
}

// note, this assumes each hash is 64 bits long
// a and b are arrays of big ints
function multiHashDistance(a, b){
    const bitErrorRate = 0.25

    let hammingCutoff = BigInt(64 * bitErrorRate);

    let distancesCount = 0n;
    let distanceSum = 0n;

    for(const hashA of a){
        let hashAMinDistance = 999999n;
        for(const hashB of b){
            let hamming = hammingDistance(hashA, hashB);

            if(hamming < hashAMinDistance){
                hashAMinDistance = hamming;
            }
        }

        if(hashAMinDistance <= hammingCutoff){
            distancesCount++;
            distanceSum += hashAMinDistance;
        }
    }

    return [Number(distancesCount), Number(distanceSum)]
}

function getLowestMultiHashDistance(dbData, hashList){
    let minDistance = 99999;
    let minUUID = null;

    for(const row of dbData){
        let hashes = row['hashes'].split(',').map(h => {return BigInt('0x' + h)})

        let [totalMatching, totalHamming] = multiHashDistance(hashList, hashes);

        if(totalMatching == 0){
            continue;
        }

        let distance = totalHamming / totalMatching;

        if(distance < minDistance){
            minDistance = distance;
            minUUID = row['cardUUID'];
        }
    }

    return [minDistance, minUUID];
}

export async function reverseSearch(multihashList){
    let rows = await dbGet('SELECT cardUUID, hashes FROM hashes');

    let out = [];

    for(const multiHash of multihashList){
        let hashes = multiHash.map(t => {return BigInt(t)});
        let [distance, uuid] = getLowestMultiHashDistance(rows, hashes);
        out.push({cardUUID: uuid, distance: distance});
    }

    return out;
}
