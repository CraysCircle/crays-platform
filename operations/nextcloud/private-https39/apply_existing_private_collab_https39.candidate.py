from pathlib import Path
import os,json,hashlib,runpy,sys,time
ROOT=Path(__file__).resolve().parent
ORIGINAL=Path('/srv/crays/migration-work/20261108/root/nextcloud-collab-reopen23-source01-rev02')
PINS={'reopen23_controller.candidate.py':'fb8c81e2ca8b42bbadd89144b66f55ee59dfa5615c058f8590a2f21808c2acd3','qualified_container_physical.py':'63b137e94a98cebdfc456a83efabd907f64b4e34ac39fe59fbf364553f3b0bdb','reopen_exact_collab_ingress23.candidate.py':'176c01432b25497c47bb24c784e50d7636d00209bc371eac657a1cde7608ad95'}
BEFORE='16c60f4013876ef2db3807d3112bfb7636d962305091050bdc5759d7c579c014'
AFTER='af00ef01fdd0f7849f75ce8e8ccbc2ea33a93cc1cadba3b4f3cbfc1c17bfb8bb'
CID='20003ed249ddaf862469f7397c10aa21d8c24b134412da05f1d11e35ef2667d5'
OUT=Path('/srv/crays/acceptance/nextcloud-private-https39-20261109-01')
def need(v,k):
 if not v:raise RuntimeError(k)
def sha(x):return hashlib.sha256(x).hexdigest()
def main():
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_ROOT_INSTANCE')
 need(len(sys.argv)==3 and sys.argv[1] in ('apply','rollback'),'EXACT_PHASE_REVIEW_ARGUMENT')
 for n,h in PINS.items():need(sha((ORIGINAL/n).read_bytes())==h,'ORIGINAL_TOOL_PIN')
 tools=runpy.run_path(str(ORIGINAL/'reopen23_controller.candidate.py'))
 read=tools['read'];save=tools['save'];phase=sys.argv[1]
 review=json.loads(read(Path(sys.argv[2]))[0])
 need(review.get('executionApproved') is True and review.get('sameCIDStopStartApproved') is True and review.get('phase')==phase and review.get('controllerSHA256')==sha(Path(__file__).read_bytes()),'EXACT_ROOT_SOURCE_REVIEW')
 before=read(ROOT/'Caddyfile.before.exact',BEFORE,65536)[0];after=read(ROOT/'Caddyfile.candidate.exact',AFTER,65536)[0]
 need(after.startswith(before) and after[len(before):]==read(ROOT/'collab-https.append.exact')[0],'ONLY_FROZEN_HTTPS_APPEND')
 c,ph=tools['owned'](CID);fp=tools['u']['fingerprints'](c)
 if phase=='apply':need(ph[:2]==(1692316,'30700710'),'CURRENT_EDGE_GENERATION')
 else:
  applied=json.loads(read(OUT/'apply'/'RESULT_ACTUAL.json')[0])
  need(applied.get('status')=='PRIVATE_COLLAB_HTTPS_SAME_CID_CONFIG_APPLIED' and ph[:2]==(applied['pid'],applied['ticks']),'ACKNOWLEDGED_APPLY_GENERATION')
 old=tools['raw_tool'](CID,'adapt',before);new=tools['raw_tool'](CID,'adapt',after)
 for raw in (before,after):tools['raw_tool'](CID,'validate',raw)
 need(old.get('admin',{}).get('disabled') is True and new.get('admin')==old.get('admin'),'ADMIN_OFF_UNCHANGED')
 tools['saved_autosave_config'](c,old if phase=='apply' else new)
 expected=BEFORE if phase=='apply' else AFTER;target=after if phase=='apply' else before;want=new if phase=='apply' else old
 current,s=read(tools['CFG'],expected,65536);inode=[s.st_dev,s.st_ino]
 through=Path('/proc',str(ph[0]),'root/etc/caddy/Caddyfile').stat()
 need([through.st_dev,through.st_ino]==inode,'ORIGINAL_BOUND_FILE_INODE')
 tools['same'](c,ph,fp)
 OUT.mkdir(mode=0o700) if not OUT.exists() else None
 need(OUT.resolve()==OUT and OUT.stat().st_uid==0 and OUT.stat().st_mode&0o777==0o700,'OWN_ACCEPTANCE_ROOT')
 out=OUT/phase;out.mkdir(mode=0o700)
 save(out/'INTENT.json',{'phase':phase,'containerId':CID,'beforeSHA256':expected,'afterSHA256':sha(target),'automaticReplayAllowed':False})
 save(out/'ADAPTED.before.private.json',old);save(out/'ADAPTED.after.private.json',new)
 tools['cas'](expected,target,inode,out,'COLLAB_HTTPS39')
 now,q=tools['restart_same'](c,ph,out)
 deadline=time.monotonic()+30
 while True:
  try:tools['saved_autosave_config'](now,want);break
  except RuntimeError:
   need(time.monotonic()<deadline,'EXACT_AUTOSAVE_POSTIMAGE');time.sleep(.2)
 read(tools['CFG'],sha(target),65536)
 result={'status':'PRIVATE_COLLAB_HTTPS_SAME_CID_CONFIG_APPLIED' if phase=='apply' else 'PRIVATE_COLLAB_HTTPS_EXACT_PREIMAGE_RESTORED','containerId':CID,'pid':q[0],'ticks':q[1],'beforeSHA256':expected,'afterSHA256':sha(target),'sameCID':True,'adminOffPreserved':True,'originalHTTPRoutePreserved':True,'privateBind':'172.26.0.1:443','existingInternalCAReused':True,'dnsPublicSecurityIdentityChanges':False,'nativeBrowserAcceptanceProven':False,'automaticReplayAllowed':False}
 save(out/'RESULT_ACTUAL.json',result);print(json.dumps(result))
if __name__=='__main__':
 try:main()
 except BaseException as e:
  print(json.dumps({'status':'PRIVATE_COLLAB_HTTPS_STOP_INSPECT_NO_REPLAY','errorClass':type(e).__name__,'rollbackAssumed':False}));sys.exit(1)
