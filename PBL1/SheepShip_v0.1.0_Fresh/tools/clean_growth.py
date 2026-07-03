from PIL import Image, ImageFilter, ImageOps
import os
folder = 'assets/sheep/growth'
files = sorted([f for f in os.listdir(folder) if f.endswith('_raw.png')])
# load images and compute max bbox
bboxes = []
images = {}
for f in files:
    p = os.path.join(folder, f)
    im = Image.open(p).convert('RGBA')
    images[f] = im
    # compute alpha bbox
    alpha = im.split()[3]
    bbox = alpha.getbbox()
    if not bbox:
        bbox = (0,0,im.width,im.height)
    bboxes.append(bbox)
# compute max content size
max_w = max(b[2]-b[0] for b in bboxes)
max_h = max(b[3]-b[1] for b in bboxes)
pad = 40
out_w = max_w + pad*2
out_h = max_h + pad*2
os.makedirs(os.path.join(folder,'cleaned'), exist_ok=True)
for f,im in images.items():
    alpha = im.split()[3]
    bbox = alpha.getbbox()
    if not bbox:
        bbox = (0,0,im.width,im.height)
    cropped = im.crop(bbox)
    # optional slight smoothing for edges
    # convert to RGBA and apply a mild filter on RGB channels
    rgb = cropped.convert('RGB').filter(ImageFilter.SMOOTH_MORE)
    cropped = Image.merge('RGBA', (rgb.split()[0], rgb.split()[1], rgb.split()[2], cropped.split()[3]))
    # create target and paste centered
    target = Image.new('RGBA', (out_w, out_h), (0,0,0,0))
    tx = (out_w - cropped.width)//2
    ty = (out_h - cropped.height)//2
    target.paste(cropped, (tx,ty), cropped)
    # save
    outname = f.replace('_raw','')
    outpath = os.path.join(folder,'cleaned', outname)
    target.save(outpath)
    print('wrote', outpath)
print('done')
