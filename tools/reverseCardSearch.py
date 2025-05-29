import mtgPHashDB
import base64
import io

from PIL import Image

def imageListDataToHashes(data):
    l = data.split('&')

    multiHashList = []

    for d in l:
        b = base64.b64decode(d)

        image = Image.open(io.BytesIO(b))

        srcHashes = mtgPHashDB.getImageHashes(image).split(',')

        hashes = [str(int('0x' + s, 16)) for s in srcHashes]

        multiHashList.append(hashes)

    #distance, cardUUID = mtgPHashDB.testDBAgainstImage(image, 'MtgCHashes.sqlite')

    return multiHashList
