from PIL import Image
import numpy as np
import imagehash

import cv2

def debugOut(npMatrix, file):
    im = Image.new('L', (npMatrix.shape[1], npMatrix.shape[0]))

    px = im.load()

    for x in range(npMatrix.shape[1]):
        for y in range(npMatrix.shape[0]):
            px[x, y] = int(npMatrix[y, x] * 255)

    im.save(file)

def normalize(npMatrix):
    n = npMatrix - np.min(npMatrix)
    n /= np.max(n)

    return n

# https://unix4lyfe.org/dct/
def dftRows(data, rowCount=32, colCount=32):
    dctXCols = []

    for rowi in range(0, rowCount):
        row = data[rowi, :]

        dctXRows = []

        for freq in range(0, colCount):
            T = 0
            for x in range(0, colCount):
                T += row[x] * np.cos(np.pi * freq * (2 * x + 1) / (2 * colCount))

            dctXRows.append(0.5 * T)

        dctXCols.append(dctXRows)

    dctX = np.array(dctXCols)

    #dctX -= np.min(dctX)

    #dctX /= np.max(dctX)

    return dctX

def phashImage(image):
    image = image.resize((32, 32), Image.BICUBIC)

    width, height = image.size

    pixels = image.load()

    # make greyscale, rescale

    cols = []

    maxValue = 0

    for y in range(0, 32):
        rows = []

        for x in range(0, 32):
            v = pixels[x / 32 * width, y / 32 * height]
            m = (v[0] + v[1] + v[2]) / 3 / 255

            rows.append(m)

        cols.append(rows)

    data = np.array(cols)

    debugOut(data, 'rescale.png')

    # DCT


    d1 = dftRows(data)
    #debugOut(normalize(d1), 'tmp.png')

    d2 = dftRows(np.transpose(d1))
    #debugOut(normalize(d2), 'tmp2.png')

    crop = normalize(d2[0:8, 0:8])

    #debugOut(crop, 'crop.png')

    median = np.median(crop)

    bit = np.ceil(crop - median)

    #debugout(bit, 'out.png')

    outHash = ''.join(['1' if n > 0.5 else '0' for n in bit.flatten()])

    #print(outHash)

    return hex(int(outHash, 2))[2:]

def CRHashImage(image):
    image = image.convert('L').resize((500, 500), Image.BICUBIC)

    hash = imagehash.crop_resistant_hash(image, min_segment_size=500, segment_threshold=64)

    return str(hash)

def CRDistance(a, b):
    aHash = imagehash.hex_to_multihash(a)
    bHash = imagehash.hex_to_multihash(b)
    totalMatching, totalHamming = aHash.hash_diff(bHash)

    #print(totalMatching, totalHamming)

    if(totalMatching == 0):
        return 999999;

    return int(totalHamming / totalMatching * 100)

#a = CRHashImage(Image.open('./test.jpg'))
#b = CRHashImage(Image.open('./test2.jpg'))
#
#diff = CRDistance(a, b)
#
#print(a, '\n\n', b, '\n\n', diff)
#print(b)
#print(phashImage(Image.open('./test.jpg')))
