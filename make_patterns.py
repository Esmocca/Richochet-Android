def print_pattern(art):
    lines = art.strip('\n').split('\n')
    max_len = max(len(line) for line in lines)
    data = []
    for line in lines:
        line = line.ljust(max_len, ' ')
        row = []
        for c in line:
            if c == ' ': row.append(0)
            elif c == '1': row.append(1) # color 1
            elif c == '2': row.append(2) # color 2
            elif c == '3': row.append(3) # color 3
            else: row.append(0)
        data.append(row)
    print("                [")
    for i, r in enumerate(data):
        print("                    [" + ", ".join(map(str, r)) + ("]" if i == len(data)-1 else "],"))
    print("                ],")

# Bird 1 (Top Dove) - Pink wings, green body
bird1 = """
  111            1
  11111        1111
   111111    11111
     11112221111
       1222221
      111221111
       111111
"""

# Bird 2 (Bottom Dove)
bird2 = """
11                11
 111            111
  111          111
   11122222222111
     1122222211
       222222
       222222
      11122111
     1111111111
"""

# Bird 3 (Small bird)
bird3 = """
     222
  11 222 11
 11112221111
  111222111
     111
"""

# Bird 4 (Gliding bird)
bird4 = """
1111          1111
  11111    11111
    1112222111
      222222
       1111
"""

# Bird 5 (Majestic bird)
bird5 = """
   11        11
 11111      11111
 1111122222211111
  11112222221111
    1222222221
      222222
      222222
     11122111
    1111111111
"""

print_pattern(bird1)
print_pattern(bird2)
print_pattern(bird3)
print_pattern(bird4)
print_pattern(bird5)
