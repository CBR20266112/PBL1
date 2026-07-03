from PIL import Image
import sys
full='assets/sheep/shearing/full.png'
shaved='assets/sheep/shearing/shaved.png'

f=Image.open(full).convert('RGBA')
s=Image.open(shaved).convert('RGBA')
print('full', f.size, 'shaved', s.size)
fw,fh=f.size
sw,sh=s.size
if (fw,fh)==(sw,sh):
    print('sizes match, nothing to do')
    sys.exit(0)
# create new transparent image with full size and paste shaved centered
out=Image.new('RGBA', (fw,fh), (0,0,0,0))
left=(fw-sw)//2
top=(fh-sh)//2
out.paste(s, (left, top))
out.save(shaved)
print('padded shaved ->', shaved, 'new size', out.size)
