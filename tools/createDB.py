import sqlite3 as sql
import requests
import os

selectColumns = [
    'artist',
    'availability',
    'cardParts',
    'colorIdentity',
    'colorIndicator',
    'colors',
    'defense',
    'life',
    'loyalty',
    'layout',
    'manaCost',
    'manaValue',
    'name',
    'number',
    'otherFaceIds',
    'power',
    'printings',
    'rarity',
    'setCode',
    'side',
    'subsets',
    'subtypes',
    'supertypes',
    'text',
    'toughness',
    'type',
    'types',
     # 'uuid',
    'variations',

     #  From Identifiers table
     # 'scryfallId',

     #  From cardPurchaseUrls table,
    'cardKingdom',
    'cardMarket',
    'tcgPlayer',

     #  From Scry
    'price',
    'image',
    'releaseDate'
]

# Download latest MTGJson DB

os.system('wget https://mtgjson.com/api/v5/AllPrintings.sqlite')

# Load scryfall data

bulkData = requests.get('https://api.scryfall.com/bulk-data').json()

scryfallDownloadUrl = bulkData['data'][2]['download_uri']

scryfall = requests.get(scryfallDownloadUrl).json()

# parse mtgjson bulk

con = sql.connect('AllPrintings.sqlite')
cur = con.cursor()

cur.execute('DROP TABLE IF EXISTS scryfall')
cur.execute('DROP TABLE IF EXISTS data')

cur.execute(
    """
    CREATE TABLE scryfall (
        scryfallId UUID,
        price FLOAT(24),
        image VARCHAR(256),
        imageBack VARCHAR(256),
        releaseDate VARCHAR(15)
    )
    """
)

# append scryfall data to table

for element in scryfall:
    image = f'https://cards.scryfall.io/normal/[side]/{element["id"][0]}/{element["id"][1]}/{element["id"]}.jpg'

    price = None

    if ('nonfoil' in element['finishes']):
        price = element['prices']['usd']
    elif ('foil' in element['finishes']):
        price = element['prices']['usd_foil']
    elif ('etched' in element['finishes']):
        price = element['prices']['usd_etched']

    if (not price):
        price = 'null'

    cur.execute(
        f"""
            INSERT INTO scryfall (scryfallId, price, image, releaseDate)
            VALUES ('{element['id']}', {price}, '{image}', '{element['released_at']}')
        """
    )

# Create new table with all the needed data

con.commit()

cur.execute(
    f"""
        CREATE TABLE data AS
        SELECT {', '.join(selectColumns)} FROM cards

        INNER JOIN cardIdentifiers ON cardIdentifiers.uuid=cards.uuid
        INNER JOIN cardPurchaseUrls ON cardPurchaseUrls.uuid=cards.uuid
        INNER JOIN scryfall ON scryfall.scryfallId=cardIdentifiers.scryfallId
    """
)

con.commit()

# Remove all extra tables

tablesToRemove = [
    'meta', 'sets', 'cards', 'tokens', 'cardIdentifiers', 'cardLegalities', 
    'cardRulings', 'cardForeignData', 'cardPurchaseUrls',
    'tokenIdentifiers', 'setTranslations', 
    'setBoosterContents', 'setBoosterContentWeights',
    'setBoosterSheets', 'setBoosterSheetCards',
    'scryfall'
]

for table in tablesToRemove:
    cur.execute(f'DROP TABLE {table}')

con.commit()

# clear space

cur.execute('VACUUM')

con.commit()

con.close()
