from PIL import Image
from io import BytesIO
import requests
import PHash
import sqlite3 as sql
import time

import os
from multiprocessing import Pool

def createPHashDB():
    if os.path.isfile('MtgPHashes.sqlite'):
        os.remove('MtgPHashes.sqlite')

    # Download DB of all cards

    con = sql.connect('MtgPHashes.sqlite')
    cur = con.cursor()

    cur.execute(
        """
        CREATE TABLE pHashes (
            uuid UUID,
            pHash VARCHAR(16)
        )
        """
    )

    cur.execute('VACUUM')

    con.commit()

    con.close()

def openImage(data):
    return Image.open(BytesIO(data))

def updateDB(maxCount):
    # Download DB of all cards

    if not os.path.isfile('AllPrintings.sqlite'):
        os.system('wget https://betterdeckbuilder.gavindistaso.com/AllPrintings.sqlite -O AllPrintings.sqlite')

    # Download DB

    con = sql.connect('MtgPHashes.sqlite')
    cur = con.cursor()

    cur.execute("ATTACH DATABASE 'AllPrintings.sqlite' AS data;")

    cur.execute(
    f'''
        SELECT uuid, image, side, layout FROM data
        WHERE data.uuid NOT IN (SELECT pHashes.uuid FROM pHashes)
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

    #

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

            hashes = pool.map(PHash.phashImage, imageCache)

            for hash, uuid, image in zip(hashes, uuidCache, imageCache):
                print(hash, uuid)
                cur.execute(
                f'''
                    INSERT INTO pHashes (uuid, pHash)
                    VALUES ('{uuid}', '{hash}')
                '''
                )

                image.close()

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

if __name__ == '__main__':
    if not os.path.isfile('MtgPHashes.sqlite'):
        createPHashDB()

    updateDB(20000)
