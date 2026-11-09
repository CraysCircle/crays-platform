"""Original Club public data acceptance; Root actual replacement required. GET only."""
from pathlib import Path
import os,sys,json,hashlib,http.client,urllib.parse,subprocess,re,html,time,datetime
P=Path(__file__).resolve().parent
EXPECTED={'isabel-maria-jeworski','thorben-biesenbach','stephanie-weyer','robin-karlsen','anouk-knuffmann'}
EDGE=Path('/srv/crays/runtime/private-edge-caddy-20261106-03/Caddyfile.private')
def need(v,c):
 if not v:raise RuntimeError(c)
def sha(v):return hashlib.sha256(v).hexdigest()
def field(cid,fmt):
 r=subprocess.run(['/usr/bin/docker','inspect','--format',fmt,cid],capture_output=True,text=True,timeout=8)
 need(r.returncode==0,'EXACT_CLUB_CONTAINER_REQUIRED');return r.stdout.strip()
def main():
 need(os.getuid()==0 and len(sys.argv)==2,'ROOT_ACTUAL_PUBLIC_BINDING_REQUIRED')
 bpath=Path(sys.argv[1]).resolve();need(str(bpath).startswith('/srv/crays/migration-work/20261108/root/'),'ROOT_BINDING_CUSTODY_REQUIRED')
 b=json.loads(bpath.read_bytes())
 need(b.get('authority')=='Root'and b.get('actualOrdinaryPublicPoolAdmitted')is True and b.get('actualClubReplacementAccepted')is True and b.get('readOnlyAcceptanceApproved')is True,'ACTUAL_ROOT_ADMISSION_AND_REPLACEMENT_REQUIRED')
 need(b['containerId']!='96a573cc2b34c9284f708a63f74776658c1a87799f85fa7d023eef96fd717ba3'and b['buildId']!='MKqk1B-xeW6DX8QPKUAfx','NEW_ENDPOINT_CAPABLE_CLUB_RELEASE_REQUIRED')
 need(re.fullmatch('[a-f0-9]{64}',b['containerId'])is not None,'EXACT_CID_REQUIRED')
 need(field(b['containerId'],'{{.State.Running}} {{.State.Pid}}')=='true '+str(b['pid']),'CURRENT_CLUB_PID_REQUIRED')
 proc=Path('/proc')/str(b['pid'])
 need(proc.joinpath('stat').read_text().rsplit(')',1)[1].split()[19]==str(b['startTicks']),'CURRENT_CLUB_GENERATION_REQUIRED')
 need(sha(EDGE.read_bytes())==b['privateEdgeSHA256'],'CURRENT_PRIVATE_EDGE_REQUIRED')
 need(Path('/proc',str(b['pid']),'root/app/.next/BUILD_ID').read_text().strip()==b['buildId'],'CURRENT_CLUB_BUILD_REQUIRED')
 out=P/'execution02';out.mkdir(mode=0o700)
 result={'status':'INCOMPLETE','rootBindingSHA256':sha(bpath.read_bytes()),'containerId':b['containerId'],'buildId':b['buildId'],'requests':[],'profiles':[],'properties':[],'writes':False,'privateDataRead':False,'imageVariantsRequested':False,'customerAuthenticated':False,'allMediaOrBrowserAcceptance':False}
 start=time.monotonic()
 def save():
  temp=out/'RESULT_ACTUAL.next.json';temp.write_text(json.dumps(result,indent=2));os.replace(temp,out/'RESULT_ACTUAL.json')
 def get(path,cap=2097152):
  need(time.monotonic()-start<110,'FINITE_110_SECOND_HTTP_BATCH')
  u=urllib.parse.urlsplit(path);need(path.startswith('/')and not u.scheme and not u.netloc and not path.startswith('//')and not u.path.startswith('/_next/image'),'EXACT_RELATIVE_ORIGINAL_GET_ONLY')
  c=http.client.HTTPConnection('127.0.0.1',18080,timeout=12)
  try:
   c.request('GET',path,headers={'Host':'www.craysclub.com','X-Forwarded-Proto':'https','Accept-Encoding':'identity','Connection':'close'})
   r=c.getresponse();body=r.read(cap+1);need(len(body)<=cap,'FINITE_ORIGINAL_RESPONSE_REQUIRED')
   meta={'path':u.path,'status':r.status,'bytes':len(body),'sha256':sha(body),'contentType':r.getheader('Content-Type'),'etag':r.getheader('ETag')}
   result['requests'].append(meta);save();need(r.status==200,'ORIGINAL_PUBLIC_GET_NOT_200')
   return body,meta
  finally:c.close()
 def readjson(path):
  raw,meta=get(path);return json.loads(raw),meta
 try:
  directory,_=readjson('/api/crays/clubs/public/ambassadors?locale=en')
  need(directory['schema']=='crays.clubs.public-ambassadors.v1'and directory['locale']=='en'and len(directory['profiles'])==5,'ORIGINAL_FIVE_PUBLIC_PROFILES_REQUIRED')
  need({p['slug']for p in directory['profiles']}==EXPECTED,'ORIGINAL_FIVE_PROFILE_RELATIONSHIPS_REQUIRED')
  for profile in directory['profiles']:
   slug=profile['slug'];media=profile['media']
   need(profile['version']>0 and profile['canonicalPath']=='/en/ambassadors/'+slug and media['width']>0 and media['height']>0,'ORIGINAL_PROFILE_VERSION_AND_MEDIA_REQUIRED')
   path='/api/crays/clubs/public/ambassadors/'+slug+'/portrait?sha='+media['sha256']
   need(media['url']==path,'ORIGINAL_PORTRAIT_URL_REQUIRED')
   portrait,meta=get(path,52428800)
   need(sha(portrait)==media['sha256']and len(portrait)==media['bytes']and meta['contentType']==media['contentType'],'ORIGINAL_PORTRAIT_BYTE_HASH_REQUIRED')
   page,pmeta=get('/en/ambassadors/'+slug)
   text=html.unescape(re.sub('<[^>]+>',' ',page.decode('utf-8')))
   heading=re.search(r'<h1[^>]*id="ambassador-name"[^>]*>(.*?)</h1>',page.decode('utf-8'),re.S)
   need(heading is not None and html.unescape(re.sub('<[^>]+>','',heading.group(1))).strip()==profile['name'],'ORIGINAL_PROFILE_RENDERED_REQUIRED')
   result['profiles'].append({'slug':slug,'version':profile['version'],'portraitSHA256':meta['sha256'],'portraitBytes':meta['bytes'],'portraitWidth':media['width'],'portraitHeight':media['height'],'profileSSR':pmeta['status']});save()
  for kind,route in [('golf','golf-hotel'),('marina','marina-hotel')]:
   pid='property-clubs-forest-city-'+kind;base='/api/crays/clubs/forest-city/properties/'+pid
   envelope,_=readjson(base+'/content');content=envelope.get('content')
   need(envelope['status']=='ready'and envelope['code']=='HOSPITALITY_PUBLIC_CONTENT_READY'and envelope['propertyId']==pid and envelope['bookingGranted']is False and envelope['nativeReadGranted']is False,'ORIGINAL_PUBLIC_CONTENT_READY_REQUIRED')
   need(content and content['propertyId']==pid and content['locale']=='en'and content['media']and content['rooms']and re.fullmatch('[a-f0-9]{64}',content['contentSha256']),'ORIGINAL_CONTENT_VERSION_AND_MEDIA_REQUIRED')
   policy,_=readjson(base+'/pricing')
   need(policy['status']=='ready'and policy['schema']=='crays.hospitality.production-planning-policy.v1'and policy['propertyId']==pid and len(policy['categories'])==7 and policy['bookingGranted']is False and policy['paymentGranted']is False,'ORIGINAL_PLANNING_PRICES_AND_DENIALS_REQUIRED')
   need(policy['billingUnit']==('night'if kind=='golf'else'calendar-month'),'ORIGINAL_PROPERTY_PRICING_UNIT_REQUIRED')
   media=next((m for m in content['media']if m['purpose']=='hero'),content['media'][0])
   need(media['url']=='/api/crays/clubs/media/'+urllib.parse.quote(media['assetId'],safe=''),'ORIGINAL_PROPERTY_MEDIA_BINDING_REQUIRED')
   raw,meta=get(media['url'],10485760)
   need(meta['etag']=='"'+meta['sha256']+'"'and meta['contentType']in ['image/jpeg','image/png','image/webp'],'ORIGINAL_UNTRANSFORMED_PROPERTY_MEDIA_REQUIRED')
   page,pmeta=get('/en/hospitality/'+route)
   visible=html.unescape(re.sub('<[^>]+>',' ',page.decode('utf-8')))
   need(content['canonicalName']in visible,'ORIGINAL_PROPERTY_DETAIL_RENDER_REQUIRED')
   result['properties'].append({'propertyId':pid,'contentVersionId':content['contentVersionId'],'contentSha256':content['contentSha256'],'mediaDeclared':len(content['media']),'roomCategories':len(content['rooms']),'pricingCategories':len(policy['categories']),'billingUnit':policy['billingUnit'],'sourcePublicationId':policy['sourcePublicationId'],'policySha256':policy['policySha256'],'rawMediaAssetId':media['assetId'],'rawMediaSHA256':meta['sha256'],'propertySSR':pmeta['status'],'bookingGranted':False,'paymentGranted':False});save()
  search,_=get('/en/search')
  need(all(x in search.decode('utf-8')for x in ['property-clubs-forest-city-golf','property-clubs-forest-city-marina']),'ORIGINAL_SEARCH_TWO_PROPERTY_BINDINGS_REQUIRED')
  directory_page,_=get('/en/ambassadors')
  need(all(slug in directory_page.decode('utf-8')for slug in EXPECTED)and b'The Ambassador directory is temporarily unavailable'not in directory_page,'ORIGINAL_DIRECTORY_REAL_DATA_REQUIRED')
  need(sha(EDGE.read_bytes())==b['privateEdgeSHA256']and proc.joinpath('stat').read_text().rsplit(')',1)[1].split()[19]==str(b['startTicks']),'CLUB_AND_EDGE_GENERATION_CHANGED_DURING_ACCEPTANCE')
  result['status']='FIVE_AMBASSADORS_PORTRAIT_BYTES_TWO_PROPERTY_CONTENT_PLANNING_AND_BOUNDED_RAW_MEDIA_SEARCH_SSR_PASS_BROWSER_AND_CUSTOMER_OPEN'
 except BaseException as e:
  result['status']='CLUB_PUBLIC_ACCEPTANCE_STOP_NO_REPLAY';result['errorClass']=type(e).__name__;result['guard']=str(e)[:160]
 finally:result['elapsedSeconds']=round(time.monotonic()-start,3);save();print(json.dumps(result))
 return 0 if result['status'].endswith('CUSTOMER_OPEN')else 1
if __name__=='__main__':raise SystemExit(main())
