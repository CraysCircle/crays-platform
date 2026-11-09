"""Specific protected Original30 NOLOGIN grantee preparation custody; source-only until Root admission."""
import hashlib,json,os,pathlib,re,subprocess,tempfile,uuid,shutil,signal,stat

ACCOUNT='391674093840';REGION='eu-central-2'
INSTANCE='i-0eb300e1b02414d8f'
IMAGE='sha256:a02db8cac496f15b094798a38254f14d6e00741f709360e5e00bb6668ea31636'
SQL_SHA='a5feae0ffb60429cfd13ac013fc15f8bb0417334f4f368920f916318ca019faa'
NAME='crays-rds-original30-preparation-20261109-01'
OWNER='01a1b9fb-d56a-75c2-8a92-92fc6f6c8404'
NETWORK_OWNER='01a19c4c-4e60-7eb3-93ea-0a15a89cfae0'

def checked_file(path,expected_hash):
    path=pathlib.Path(path)
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NOATIME)
    try:
        st=os.fstat(fd)
        if not (stat.S_ISREG(st.st_mode) and st.st_uid==0 and st.st_nlink==1 and stat.S_IMODE(st.st_mode) in (0o400,0o600) and 0<st.st_size<=1048576):
            raise RuntimeError('REGULAR_ROOT_PROTECTED_PINNED_INPUT_REQUIRED')
        payload=os.read(fd,1048577)
        if len(payload)!=st.st_size or os.fstat(fd)!=st or os.stat(path,follow_symlinks=False)!=st:
            raise RuntimeError('STABLE_PINNED_INPUT_REQUIRED')
    finally:os.close(fd)
    if hashlib.sha256(payload).hexdigest()!=expected_hash:
        raise RuntimeError('PINNED_INPUT_DIFFERS')
    return payload

def docker(*args,timeout=15):
    return subprocess.run(['/usr/bin/docker',*args],capture_output=True,text=True,
                          timeout=timeout,env={'PATH':'/usr/bin:/bin'})

def restore(binding,sql_path,ca_path,operations):
    """binding comes from actual native RDS metadata readback, not speculative IDs."""
    os.umask(0o077)
    def interrupted(signum,frame):raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM,interrupted);signal.signal(signal.SIGINT,interrupted)
    if os.getuid()!=0 or pathlib.Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()!=INSTANCE:
        raise RuntimeError('EXACT_EXISTING_AWS_HOST_REQUIRED')
    if (binding['databaseIdentifier']!='crays-prod-postgres-20261106-01'
        or binding['region']!=REGION or binding['status']!='available'
        or binding['port']!=5432 or binding.get('engineVersion')!='18.6'):
        raise RuntimeError('ACTUAL_AVAILABLE_RDS_BINDING_REQUIRED')
    endpoint=binding['endpoint']
    if not re.fullmatch(r'crays-prod-postgres-20261106-01\.[a-z0-9]+\.eu-central-2\.rds\.amazonaws\.com',endpoint):
        raise RuntimeError('EXACT_RDS_ENDPOINT_REQUIRED')
    secret_arn=binding.get('masterSecretArn','')
    if not re.fullmatch(r'arn:aws:secretsmanager:eu-central-2:391674093840:secret:rds![A-Za-z0-9_!.-]+',secret_arn):
        raise RuntimeError('ACTUAL_NATIVE_RDS_MANAGED_SECRET_ARN_REQUIRED')
    if not binding.get('masterSecretVersionId'):
        raise RuntimeError('ACTUAL_NATIVE_MASTER_SECRET_VERSION_REQUIRED')
    sql=checked_file(sql_path,SQL_SHA)
    restore_inputs=operations['inputs']()
    ca=checked_file(ca_path,binding['caBundleSHA256'])
    if b'-----BEGIN CERTIFICATE-----' not in ca:
        raise RuntimeError('RDS_CA_BUNDLE_REQUIRED')
    mount=subprocess.run(['/usr/bin/findmnt','-n','-o','FSTYPE','-T','/run'],capture_output=True,text=True,check=True)
    if mount.stdout.strip()!='tmpfs':
        raise RuntimeError('CREDENTIAL_DIRECTORY_REQUIRES_TMPFS')
    image=docker('image','inspect',IMAGE)
    if image.returncode!=0 or json.loads(image.stdout)[0]['Id']!=IMAGE:
        raise RuntimeError('EXISTING_QUALIFIED_PG18_IMAGE_REQUIRED')
    network=docker('network','inspect','crays-private-app-canonical-20261106-01')
    n=json.loads(network.stdout)[0] if network.returncode==0 else {}
    if (n.get('Name')!='crays-private-app-canonical-20261106-01' or n.get('Id')!='f023edae110b963b4c6a24ae708256c02c6c962fb0302f5d23bd52b615244dea'
        or n.get('Driver')!='bridge' or n.get('Internal') or n.get('EnableIPv6')
        or n.get('Labels',{}).get('crays.owner.thread')!=NETWORK_OWNER
        or n.get('Options',{}).get('com.docker.network.bridge.enable_icc')!='false'):
        raise RuntimeError('EXISTING_PRIVATE_NETWORK_REQUIRED')
    absence=docker('inspect',NAME)
    if not (absence.returncode==1 and absence.stdout.strip()=='[]' and absence.stderr.strip().lower()=='error: no such object: '+NAME.lower()):
        raise RuntimeError('PRIOR_ADMISSION_CONTAINER_EXISTS_INSPECT_NO_REPLAY')
    result_path=pathlib.Path('/srv/crays/acceptance/native-core-original30-grantee-preparation-20261109-01.intent.json')
    # A fresh exclusive intent persists even if later connection/cleanup fails.
    fd=os.open(result_path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
    with os.fdopen(fd,'w') as f:
        json.dump({'status':'ORIGINAL30_NOLOGIN_GRANTEE_PREPARATION_INTENT_NO_REPLAY','endpoint':endpoint,
                   'databaseIdentifier':binding['databaseIdentifier'],'sqlSHA256':SQL_SHA},f)
        f.flush();os.fsync(f.fileno())
    import boto3
    from botocore.config import Config
    config=Config(retries={'total_max_attempts':1},connect_timeout=5,read_timeout=15)
    actor=boto3.client('sts',region_name=REGION,config=config).get_caller_identity()
    if actor['Account']!=ACCOUNT or not actor['Arn'].startswith('arn:aws:sts::391674093840:assumed-role/crays-standing-owner-host-v1/'):
        raise RuntimeError('EXACT_EXISTING_HOST_ROLE_REQUIRED')
    # Host keeps existing boundary: assume exact migration role; no secret values leave guest.
    role=boto3.client('sts',region_name=REGION,config=config).assume_role(
        RoleArn='arn:aws:iam::391674093840:role/crays-runtime/prod/crays-rds-migration-v1',
        RoleSessionName='crays-rds-original30-preparation',DurationSeconds=900)
    creds=role['Credentials']
    client=boto3.client('secretsmanager',region_name=REGION,config=config,
        aws_access_key_id=creds['AccessKeyId'],aws_secret_access_key=creds['SecretAccessKey'],
        aws_session_token=creds['SessionToken'])
    role.clear();creds=None
    obj=client.get_secret_value(SecretId=secret_arn,VersionId=binding['masterSecretVersionId'],VersionStage='AWSCURRENT')
    if obj.get('ARN')!=secret_arn or obj.get('VersionId')!=binding['masterSecretVersionId']:
        raise RuntimeError('EXACT_MANAGED_SECRET_VERSION_REQUIRED')
    payload=obj.pop('SecretString',None)
    if not isinstance(payload,str) or len(payload)>4096:
        raise RuntimeError('MANAGED_SECRET_TEXT_REQUIRED')
    secret=json.loads(payload);payload=None;obj.clear()
    password=secret.get('password')
    if secret.get('username')!='crays_rds_admin' or not isinstance(password,str) or not re.fullmatch(r'[^\x00-\x20\x7f]{16,128}',password):
        raise RuntimeError('MANAGED_SECRET_FIELDS_REJECTED')
    cid=None;attempted=False;clean=False;attempt=uuid.uuid4().hex;observed_pid=0;cgroup_path=None
    job=pathlib.Path(tempfile.mkdtemp(prefix='crays-rds-original30-preparation-20261109-01-',dir='/run'))
    os.chown(job,1000,1000)
    # libpq password files escape both backslash and colon; no credentials in argv/environment.
    escaped=password.replace('\\','\\\\').replace(':','\\:')
    items={'pgpass':f'{endpoint}:5432:postgres:crays_rds_admin:{escaped}\n'.encode(),
           'compatibility.sql':sql,'ca.pem':ca,**restore_inputs}
    restore_inputs.clear()
    try:
        for name,data in items.items():
            path=job/name
            fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
            with os.fdopen(fd,'wb') as f:f.write(data)
            os.chown(path,1000,1000)
        secret.clear();password=None;escaped=None;items.clear();data=None
        attempted=True
        created=docker('create','--pull=never','--name',NAME,'--label','crays.owner.thread='+OWNER,
            '--label','crays.admission.attempt='+attempt,'--network','crays-private-app-canonical-20261106-01','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true',
            '--cpus','0.25','--memory','256m','--memory-swap','256m','--pids-limit','32','--user','1000:1000',
            '--tmpfs','/tmp:rw,nosuid,noexec,size=16777216,mode=1777',
                '--tmpfs','/var/lib/postgresql:rw,nosuid,noexec,size=1048576,mode=0700',
                '--log-driver','none',
            '--mount','type=bind,src='+str(job)+',dst=/input,readonly',
            '--env','PGPASSFILE=/input/pgpass','--env','PGSSLMODE=verify-full',
            '--env','PGSSLROOTCERT=/input/ca.pem','--env','PGCONNECT_TIMEOUT=5',
            '--env','PGOPTIONS=-c default_transaction_read_only=off -c statement_timeout=45000 -c lock_timeout=5000',
            '--entrypoint','sleep',IMAGE,'120')
        if created.returncode!=0:
            raise RuntimeError('CREATE_OUTCOME_UNCERTAIN_INSPECT_EXACT_CONTAINER')
        cid=created.stdout.strip()
        if not re.fullmatch(r'[0-9a-f]{64}',cid):
            raise RuntimeError('EXACT_CONTAINER_ID_REQUIRED')
        before=docker('inspect',cid)
        actual=json.loads(before.stdout)[0];hc=actual['HostConfig'];conf=actual['Config']
        mounts={m['Destination']:m for m in actual['Mounts']}
        if (actual['Image']!=IMAGE or conf['User']!='1000:1000' or not hc['ReadonlyRootfs']
            or hc['NanoCpus']!=250000000 or hc['Memory']!=268435456 or hc['PidsLimit']!=32
            or hc['NetworkMode']!='crays-private-app-canonical-20261106-01'
            or set(hc['CapDrop'])!={'ALL'} or 'no-new-privileges:true' not in hc['SecurityOpt']
            or hc.get('PortBindings') or any(m['Type']=='volume' for m in actual['Mounts'])
            or mounts.get('/input',{}).get('Source')!=str(job) or mounts['/input']['RW']
            or '/var/lib/postgresql' not in hc['Tmpfs']):
            raise RuntimeError('CLIENT_ISOLATION_DIFFERS')
        if docker('start',cid).returncode!=0:raise RuntimeError('START_OUTCOME_UNCERTAIN')
        live=json.loads(docker('inspect',cid).stdout)[0];observed_pid=live['State']['Pid']
        if observed_pid:
            proc=pathlib.Path('/proc')/str(observed_pid)/'cgroup'
            try:rows=proc.read_text().splitlines()
            except FileNotFoundError:rows=[]
            for row in rows:
                fields=row.split(':',2)
                if fields[:2]==['0','']:
                    if cid not in fields[2] or '..' in fields[2].split('/'):
                        raise RuntimeError('OWN_CLIENT_CGROUP_DIFFERS')
                    cgroup_path=pathlib.Path('/sys/fs/cgroup')/fields[2].lstrip('/')
        return operations['run'](cid,job,endpoint)
    finally:
        signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN)
        def attempt_docker(*args,timeout=8):
            try:return docker(*args,timeout=timeout)
            except subprocess.TimeoutExpired:return None
        def inspect_own():
            result=attempt_docker('inspect',cid or NAME)
            if result is None:raise RuntimeError('INSPECTION_UNCERTAIN_RETAIN_PRIVATE_JOB')
            if result.returncode==1 and result.stdout.strip()=='[]' and result.stderr.strip().lower()=='error: no such object: '+(cid or NAME).lower():return None
            if result.returncode!=0:raise RuntimeError('OWN_CREATE_UNCERTAIN_RETAIN_PRIVATE_JOB')
            item=json.loads(result.stdout)[0]
            if (item['Image']!=IMAGE or item['Name']!='/'+NAME
                or item['Config']['Labels'].get('crays.owner.thread')!=OWNER
                or item['Config']['Labels'].get('crays.admission.attempt')!=attempt):
                raise RuntimeError('OWN_CLIENT_DIFFERS_RETAIN_PRIVATE_JOB')
            m={m['Destination']:m for m in item['Mounts']}
            if m.get('/input',{}).get('Source')!=str(job) or m['/input']['RW']:
                raise RuntimeError('OWN_CLIENT_MOUNT_DIFFERS_RETAIN_PRIVATE_JOB')
            return item
        if attempted:
            item=inspect_own()
            if item is not None:
                own_id=item['Id']
                if item['State']['Running']:
                    attempt_docker('stop','--time','3',own_id,timeout=6)
                    item=inspect_own()
                    if item is not None and item['State']['Running']:
                        attempt_docker('kill','--signal','KILL',own_id,timeout=6)
                        item=inspect_own()
                if item is not None and (item['State']['Running'] or item['State']['Pid']!=0):
                    raise RuntimeError('OWN_CLIENT_LIVE_RETAIN_PRIVATE_JOB')
                if observed_pid and pathlib.Path('/proc',str(observed_pid),'cgroup').exists():
                    rows=pathlib.Path('/proc',str(observed_pid),'cgroup').read_text()
                    if cid in rows:raise RuntimeError('OWN_CLIENT_PROCESS_LIVE_RETAIN_PRIVATE_JOB')
                if cgroup_path is not None:
                    procs=cgroup_path/'cgroup.procs'
                    if procs.exists() and procs.read_text().strip():
                        raise RuntimeError('OWN_CLIENT_CGROUP_LIVE_RETAIN_PRIVATE_JOB')
                attempt_docker('rm',own_id)
                if inspect_own() is not None:raise RuntimeError('REMOVAL_UNPROVEN_RETAIN_PRIVATE_JOB')
            clean=True
        else:clean=True
        if clean:shutil.rmtree(job)
