from PIL import Image
import numpy as np


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
def dftRows(data):
    dctXCols = []

    for rowi in range(0, 32):
        row = data[rowi, :]

        dctXRows = []

        for freq in range(0, 32):
            T = 0
            for x in range(0, 32):
                T += row[x] * np.cos(np.pi * freq * (2 * x + 1) / (2 * 32))

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

    #debugOut(bit, 'out.png')

    outHash = ''.join(['1' if n > 0.5 else '0' for n in bit.flatten()])

    #print(outHash)

    return hex(int(outHash, 2))[2:]

#print(phashImage('./test.jpg'))
