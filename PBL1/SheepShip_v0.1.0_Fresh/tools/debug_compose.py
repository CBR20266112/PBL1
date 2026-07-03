from PIL import Image
paths = {'full':'assets/sheep/shearing/full.png','shaved':'assets/sheep/shearing/shaved.png','wool':'assets/sheep/shearing/wool.png'}
for k,p in paths.items():
    try:
        img=Image.open(p)
        print(k, img.size, img.mode)
    except Exception as e:
        print('ERR',k,e)

# load and ensure RGBA
f=Image.open(paths['full']).convert('RGBA')
s=Image.open(paths['shaved']).convert('RGBA')
w=Image.open(paths['wool']).convert('RGBA')
if f.size!=s.size or f.size!=w.size:
    print('SIZE_MISMATCH', f.size, s.size, w.size)

f_pixels = list(f.getdata())
s_pixels = list(s.getdata())
w_pixels = list(w.getdata())
# compute composite alpha full - shaved
comp_alpha=0
comp_pixels_count=0
bad_count=0
for i,(fp,sp) in enumerate(zip(f_pixels,s_pixels)):
    fa=fp[3]
    sa=sp[3]
    ca = max(0, fa - sa)
    if ca>0:
        comp_pixels_count+=1
    if sa>0 and ca>0:
        bad_count+=1
    comp_alpha+=ca
print('comp_pixels_count', comp_pixels_count)
print('comp_alpha_sum', comp_alpha)
print('bad_count(shaved overlap with comp)', bad_count)
# also check if wool.png matches our composite roughly
w_alpha_sum = sum([p[3] for p in w_pixels])
print('w_alpha_sum', w_alpha_sum)
# write composite image for inspection
comp=Image.new('RGBA', f.size)
comp_data=[]
for fp,sp in zip(f_pixels,s_pixels):
    fa=fp[3]
    sa=sp[3]
    ca = max(0, fa - sa)
    if ca>0:
        comp_data.append((fp[0],fp[1],fp[2],ca))
    else:
        comp_data.append((0,0,0,0))
comp.putdata(comp_data)
comp.save('tools/debug_comp.png')
print('wrote tools/debug_comp.png')
