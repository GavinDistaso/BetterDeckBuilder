import mtgPHashDB
import base64
import io

from PIL import Image

def reverseCardSearch(data):
    b = base64.b64decode(data)

    image = Image.open(io.BytesIO(b))

    distance, cardUUID = mtgPHashDB.testDBAgainstImage(image, 'MtgCHashes.sqlite')

    return [cardUUID, distance]
