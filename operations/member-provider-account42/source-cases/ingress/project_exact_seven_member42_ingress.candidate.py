import re,hashlib
ORIGINAL='af00ef01fdd0f7849f75ce8e8ccbc2ea33a93cc1cadba3b4f3cbfc1c17bfb8bb'
MEMBER='172.24.0.2:8990';OLD_WORK=MEMBER
BODY='Crays private services temporarily unavailable.'
def need(v,g):
 if not v:raise RuntimeError(g)
def spans(raw):
 text=raw.decode();lines=text.splitlines(keepends=True);offset=0;result=[]
 for i,l in enumerate(lines):
  m=re.fullmatch(r'([ \t]*)reverse_proxy (172\.24\.0\.2:8990|172\.26\.0\.3:8080) \{\n',l)
  if m:
   indent,dial=m.groups();j=i+1
   while j<len(lines)and lines[j]!=indent+'}\n':j+=1
   need(j<len(lines),'EXACT_PROXY_BLOCK_END')
   end=offset+sum(len(t.encode())for t in lines[i:j+1]);result.append((offset,end,indent,dial))
  offset+=len(l.encode())
 need(len(result)==7 and all(x[3]==MEMBER for x in result),'EXACT_SEVEN_PROXY_BLOCKS')
 need(all(a[1]<=b[0]for a,b in zip(result,result[1:])),'NONOVERLAPPING_PROXY_BLOCKS')
 return result
def close(raw):
 need(hashlib.sha256(raw).hexdigest()==ORIGINAL,'EXACT_ORIGINAL_EDGE_SHA')
 out=raw
 for a,b,indent,dial in reversed(spans(raw)):
  out=out[:a]+(indent+'respond "'+BODY+'" 503\n').encode()+out[b:]
 return out
def reopen(original,closed,target):
 need(target==MEMBER,'EXACT_COMMON32_TEAM_MEMBER_PRIVATE_TARGET')
 need(close(original)==closed,'EXACT_CLOSED_PREIMAGE')
 return original
def validate_adapted(opened,closed,work=OLD_WORK):
 counts={MEMBER:0,work:0}
 def walk(a,b):
  if isinstance(a,dict)and a.get('handler')=='reverse_proxy'and a.get('upstreams')in([{'dial':MEMBER}],[{'dial':work}]):
   dial=a['upstreams'][0]['dial'];counts[dial]+=1
   need(isinstance(b,dict)and set(b)=={'handler','body','status_code'}and b['handler']=='static_response'and b['body']==BODY and str(b['status_code'])=='503','EXACT_STATIC_MAINTENANCE_HANDLER')
   return
  need(type(a)is type(b),'OUTSIDE_ADAPTED_TYPE')
  if isinstance(a,dict):
   need(set(a)==set(b),'OUTSIDE_ADAPTED_KEYS')
   for k in a:walk(a[k],b[k])
  elif isinstance(a,list):
   need(len(a)==len(b),'OUTSIDE_ADAPTED_LIST')
   for x,y in zip(a,b):walk(x,y)
  else:need(a==b,'OUTSIDE_ADAPTED_VALUE')
 walk(opened,closed)
 need(counts==({MEMBER:7}if work==MEMBER else{MEMBER:4,work:3}),'EXACT_ADAPTED_SEVEN_PRIVATE_HANDLERS')
 return True
