import os
import re

def fix_jsx_strings(content):
    # Pattern to match '<span className="material-symbols-outlined...">...</span> text'
    # We want to replace it with <><span className="material-symbols-outlined...">...</span> text</>
    
    # Let's match single-quoted strings containing the span
    # Pattern: ' <span ...>...</span> text '
    
    # First, handle template literals ` <span ...>...</span> text `
    # E.g. flash(`...`) -> flash(<>...</>)
    def repl_template(m):
        inner = m.group(1)
        # If there is variable interpolation ${...}, we can't just strip backticks easily if it's used inside a JSX string.
        # But wait, flash() takes a ReactNode? If flash takes a ReactNode, we can just do flash(<>...</>).
        # Let's just fix single/double quotes first, because that's what's causing the main issue.
        return f"<>{inner}</>"
        
    def repl_single(m):
        inner = m.group(1)
        return f"<>{inner}</>"
        
    def repl_double(m):
        inner = m.group(1)
        return f"<>{inner}</>"

    # We need a regex that matches:
    # ' (starts with quote)
    # optional spaces
    # <span className="material-symbols-outlined
    # ...
    # </span>
    # optional text
    # ' (ends with quote)
    
    pattern_single = r"'(<span className=\"material-symbols-outlined.*?</span>.*?)'"
    content = re.sub(pattern_single, repl_single, content)
    
    pattern_double = r'"(<span className=\\"material-symbols-outlined.*?</span>.*?)"'
    # This might be tricky because of escaped quotes, but let's assume it's just standard double quotes.
    content = re.sub(pattern_double, repl_double, content)
    
    # For backticks: `<span ...</span>...`
    pattern_backtick = r"`(<span className=\"material-symbols-outlined.*?</span>.*?)`"
    # Actually, in JSX, if we replace backticks with `<>...</>`, then `${var}` needs to become `{var}`.
    # Let's handle backticks separately. For now, let's just do single quotes.
    
    # Fix the empty fragments where it's just `<><span...></span></>` to `<span...></span>`
    content = content.replace("<><span", "<span").replace("</span></>", "</span>")
    
    return content

def fix_backticks(content):
    # Fix flash(`...`) 
    # flash(`<span className="material-symbols-outlined mr-2 align-middle text-[1.1em]">check_circle</span> Drive updated successfully!`)
    # should become:
    # flash(<><span className="material-symbols-outlined mr-2 align-middle text-[1.1em]">check_circle</span> Drive updated successfully!</>)
    pattern_backtick = r"`(<span className=\"material-symbols-outlined.*?</span>.*?)`"
    
    def repl(m):
        inner = m.group(1)
        # replace ${var} with {var} inside the fragment
        inner = re.sub(r'\$\{([^}]+)\}', r'{\1}', inner)
        return f"<>{inner}</>"
        
    content = re.sub(pattern_backtick, repl, content)
    content = content.replace("<><span", "<span").replace("</span></>", "</span>")
    return content

if __name__ == '__main__':
    for root, _, files in os.walk(r'C:\Users\suraj\Desktop\placement\frontend\src'):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    original = f.read()
                
                content = fix_jsx_strings(original)
                content = fix_backticks(content)
                
                if content != original:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Fixed {file}")
