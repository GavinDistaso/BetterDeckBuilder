from PIL import Image
from io import BytesIO
import requests
import PHash
import sqlite3 as sql
import time

import os
from multiprocessing import Pool

def openImage(data):
    return Image.open(BytesIO(data))

def updateDB(maxCount):
    # Download DB of all cards

    if not os.path.isfile('AllPrintings.sqlite'):
        os.system('wget https://betterdeckbuilder.gavindistaso.com/AllPrintings.sqlite -O AllPrintings.sqlite')

    # Download DB

    con = sql.connect('MtgCHashes.sqlite')
    cur = con.cursor()

    cur.execute("CREATE TABLE IF NOT EXISTS hashes (cardUUID UUID, hashes TEXT);")

    cur.execute("ATTACH DATABASE 'AllPrintings.sqlite' AS data;")

    cur.execute(
    f'''
        SELECT uuid, image, side, layout FROM data
        WHERE data.uuid NOT IN (SELECT hashes.cardUUID FROM hashes)
        ORDER BY data.releaseDate DESC
        LIMIT {maxCount}
    ''')

    rows = cur.fetchall()

    # Create PHashes

    downloadStart = round(time.time() * 1000)

    downloadCount = len(rows)

    imageCache = []
    uuidCache = []

    i = 0

    iSuccess = 0

    #, min_segment_size=500, segmentation_image_size=1000

    pool = Pool()

    for uuid, imageURL, side, layout in rows:
        i += 1
        startMills = round(time.time() * 1000)

        side = 'front'

        if(side == 'b' and (card.layout == 'transform' or card.layout == 'convert' or card.layout == 'modal_dfc')):
            side = 'back'

        imageURL = imageURL.replace('normal', 'small').replace('[side]', side)

        r = requests.get(imageURL)

        if(not r.ok):
            print(f'===== {uuid} Failed, skipping =====')
        else:
            iSuccess += 1
            imageCache.append(r.content)

            uuidCache.append(uuid)

        if(len(imageCache) == 50):
            imageCache = pool.map(openImage, imageCache)

            try:
                hashes = pool.map(PHash.CRHashImage, imageCache)

                for hash, uuid, image in zip(hashes, uuidCache, imageCache):
                    print(hash, uuid)
                    cur.execute(
                    f'''
                        INSERT INTO hashes (cardUUID, hashes)
                        VALUES ('{uuid}', '{hash}')
                    '''
                    )

                    image.close()
            except BaseException as e:
                print(f'Error has occured, skipping: {e}')

            imageCache.clear()
            uuidCache.clear()



            endMills = round(time.time() * 1000)
            rate = (iSuccess) / (endMills - downloadStart) * 1000
            timeLeft = (downloadCount - i) / rate
            print(str(round(timeLeft / 60)) + 'mins remaining', f'({i}/{downloadCount})', f'{round(rate * 60)} img/m')

        endMills = round(time.time() * 1000)
        durration = endMills - startMills

        offset = max(100 - durration, 0)

        time.sleep(offset / 1000)

        if(i % 50 == 0):
            con.commit()


    #

    con.commit()

    con.close()

def testDBAgainstImage(image, db='MtgCHashes.sqlite'):
    src = PHash.CRHashImage(image)

    con = sql.connect(db)
    cur = con.cursor()

    cur.execute("SELECT hashes, cardUUID FROM hashes");

    rows = cur.fetchall()

    minD = 10000000;
    minV = [];
    minUUID = None;

    for hashes, uuid in rows:
        d = PHash.CRDistance(src, hashes)

        if(d < minD):
            minD = d
            minV = hashes
            minUUID = uuid

    con.close();

    #print(minD, minUUID, src)

    return [minD, minUUID]

def downloadDB(output='MtgCHashes.sqlite'):
    os.system(f'wget https://betterdeckbuilder.gavindistaso.com/MtgCHashes.sqlite -O {output}')


if __name__ == '__main__':
    updateDB(20000)

    URL = 'https://bdbapi.gavindistaso.com:8443/'

    r = requests.get(URL + 'auth', headers={'credentials-email': os.environ['USR'], 'credentials-password': os.environ['PASS']})

    print(r.text)

    bearer = r.json()['payload']['bearerToken']

    r = requests.get(URL + 'backend/updateimagehashdb', headers={'authorization': 'Bearer ' + bearer})

    print(r.text)

    print(r.json())
