from PIL import Image

def is_black(r, g, b, t=25):
    return r < t and g < t and b < t

def process_image(filepath):
    try:
        img = Image.open(filepath).convert("RGBA")
    except:
        return
    
    pixels = img.load()
    w, h = img.size
    
    visited = set()
    queue = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    
    # We want to replace black background with transparent.
    while queue:
        x, y = queue.pop(0)
        if (x, y) in visited:
            continue
        visited.add((x, y))
        
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
            
        r, g, b, a = pixels[x, y]
        if is_black(r, g, b):
            pixels[x, y] = (0, 0, 0, 0)
            queue.append((x + 1, y))
            queue.append((x - 1, y))
            queue.append((x, y + 1))
            queue.append((x, y - 1))
            
    img.save(filepath)
    print(f"Processed {filepath}")

for i in range(1, 6):
    process_image(f"img/planet{i}.png")
print("Done")
