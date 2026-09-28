import json

with open('patterns.json', 'r') as f:
    patterns_data = json.load(f)

with open('js/game.js', 'r', encoding='utf-8') as f:
    js_code = f.read()

js_patterns = 'const patterns = [\n'
for p in patterns_data:
    js_patterns += '    {\n        data: [\n'
    for row in p:
        formatted_row = ', '.join([f'"{c}"' if isinstance(c, str) else str(c) for c in row])
        js_patterns += f'            [{formatted_row}],\n'
    js_patterns += '        ]\n    },\n'
js_patterns += '];\n'

start_idx = js_code.find('const patterns = [')
if start_idx != -1:
    end_idx = js_code.find('];\n', start_idx)
    if end_idx != -1:
        end_idx += 3
        new_js = js_code[:start_idx] + js_patterns + js_code[end_idx:]
        with open('js/game.js', 'w', encoding='utf-8') as f:
            f.write(new_js)
        print('Injected successfully!')
    else:
        print('Could not find end of patterns array.')
else:
    print('Could not find patterns array.')
