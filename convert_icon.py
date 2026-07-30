import os
import cairosvg

# Sizes for launcher icons
sizes = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
}

svg_path = 'Jamrah-Icon.svg'
base_res_dir = r'android\app\src\main\res'

for density, size in sizes.items():
    mipmap_dir = os.path.join(base_res_dir, f'mipmap-{density}')
    os.makedirs(mipmap_dir, exist_ok=True)
    out_path = os.path.join(mipmap_dir, 'ic_jamrah.png')
    
    print(f'Converting {density} -> {size}x{size}')
    try:
        cairosvg.svg2png(url=svg_path, write_to=out_path, output_width=size, output_height=size)
    except Exception as e:
        print(f"Error: {e}")

print("Done generating launcher icons.")
