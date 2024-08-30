import glob
import os

for file in glob.glob('**/*.js', recursive=True):
    os.system(f'terser --compress -passes=2 -mangle --mangle-props -o {file} -- {file}')
