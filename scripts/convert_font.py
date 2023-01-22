import re
import subprocess
import shutil

def main():
    subprocess.run(['./scripts/woff2svg.ff', '../blockbench/font/icomoon.woff', './tmp'])
    with open('../blockbench/css/setup.css', 'r') as f:
        classes = f.read().split('/*Icons*/')[1].strip().split('\n\n\n')[1].split('}')
        for c in classes:
            name_match = re.search(r'\.(.*):', c)
            if name_match == None:
                continue

            name = name_match.group(1)
            code_match = re.search(r'"\\(.*)"', c)
            if code_match == None:
                print(c)

            code = int(code_match.group(1), 16)
            shutil.copyfile(f'./tmp/uni{code:04X}-{code}.svg', f'./resources/custom/{name}.svg')
            
if __name__ == '__main__':
    main()