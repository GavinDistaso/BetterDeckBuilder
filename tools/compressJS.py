import glob
import os

for file in glob.glob('**/*.js', recursive=True):
    os.system(f'terser --compress --mangle -- {file}')
