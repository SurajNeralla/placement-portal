import os
import glob

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = content.replace('localhost:8000', '127.0.0.1:8000')
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

if __name__ == '__main__':
    for root, _, files in os.walk(r'C:\Users\suraj\Desktop\placement\frontend\src'):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                replace_in_file(os.path.join(root, file))
