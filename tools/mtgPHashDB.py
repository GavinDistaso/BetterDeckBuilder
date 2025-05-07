from PIL import Image
from io import BytesIO
import requests
import PHash
import sqlite3 as sql
import time

import os

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

    i = 0

    for uuid, imageURL, side, layout in rows:
        i += 1
        startMills = round(time.time() * 1000)

        side = 'front'

        if(side == 'b' and (card.layout == 'transform' or card.layout == 'convert' or card.layout == 'modal_dfc')):
            side = 'back'

        imageURL = imageURL.replace('normal', 'small').replace('[side]', side)

        hash = '0'

        try:
            r = requests.get(imageURL)

            image = Image.open(BytesIO(r.content))

            hash = PHash.phashImage(image)

            image.close()
        except:
            print(f'===== {uuid} Failed, skipping =====')

        cur.execute(
        f'''
            INSERT INTO pHashes (uuid, pHash)
            VALUES ('{uuid}', '{hash}')
        '''
        )

        endMills = round(time.time() * 1000)
        durration = endMills - startMills

        offset = max(100 - durration, 0)

        rate = (i) / (endMills - downloadStart)

        timeLeft = downloadCount / rate

        print(hash, durration, str(round(timeLeft / 1000 / 60)) + 'mins', f'({i}/{downloadCount})')

        time.sleep(durration / 1000)

        if(i % 50 == 0):
            con.commit()


    #

    con.commit()

    con.close()

if not os.path.isfile('MtgPHashes.sqlite'):
    createPHashDB()

updateDB(20000)
