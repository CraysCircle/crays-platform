#!/usr/bin/python3
"""Root-only, finite official python-acme DNS01 bootstrap; SOURCE ONLY until Root execution."""
import argparse, datetime as dt, hashlib, json, logging, os, re, signal, stat, subprocess, sys
from pathlib import Path
STATE = Path("/srv/crays/private/public-tls19-dns01-bootstrap01")
DIRECTORY = "https://acme-v02.api.letsencrypt.org/directory"
DOMAINS = ("crays.coffee","crays.shop","crays.pro","crays.world","craysaward.com","crays.org","crays.fund","crays.fun","crays.net")
NAMES = tuple(n for d in DOMAINS for n in (d,"www."+d)) + ("member.crays.world",)
NS = {
"crays.coffee":("docks05.rzone.de.","shades05.rzone.de."),
"crays.shop":("docks18.rzone.de.","shades17.rzone.de."),
"crays.pro":("docks01.rzone.de.","shades07.rzone.de."),
"crays.world":("docks15.rzone.de.","shades17.rzone.de."),
"craysaward.com":("docks15.rzone.de.","shades06.rzone.de."),
"crays.org":("docks13.rzone.de.","shades08.rzone.de."),
"crays.fund":("docks18.rzone.de.","shades18.rzone.de."),
"crays.fun":("docks15.rzone.de.","shades06.rzone.de."),
"crays.net":("docks09.rzone.de.","shades17.rzone.de.")}
FD = None
class GuardError(Exception): pass
def require(value, code):
    if not value: raise GuardError(code)
def stop(signum, frame):
    raise KeyboardInterrupt()
def write(name, body):
    require("/" not in name and name not in (".",".."), "STATE_NAME")
    data = body.encode() if isinstance(body,str) else body
    fd = os.open(name, os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW, 0o400, dir_fd=FD)
    with os.fdopen(fd,"wb") as out:
        out.write(data); out.flush(); os.fsync(out.fileno())
    os.fsync(FD)
def read(name):
    fd = os.open(name,os.O_RDONLY|os.O_NOFOLLOW,dir_fd=FD)
    with os.fdopen(fd,"rb") as inp:
        s=os.fstat(inp.fileno())
        require(stat.S_ISREG(s.st_mode) and s.st_uid==0 and s.st_gid==0 and stat.S_IMODE(s.st_mode)==0o400 and s.st_nlink==1 and s.st_size<=4*1024*1024,"STATE_CUSTODY")
        return inp.read()
def put(name,obj):
    write(name,json.dumps(obj,sort_keys=True,indent=2)+"\n")
def get(name):
    return json.loads(read(name))
def official():
    import importlib.metadata
    require(importlib.metadata.version("acme")=="2.9.0","ACME_VERSION")
    require(importlib.metadata.version("josepy")=="1.14.0","JOSE_VERSION")
    from acme import client, messages, challenges
    import josepy
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID
    return client,messages,challenges,josepy,x509,hashes,serialization,rsa,NameOID
def netclient(account_key, account=None):
    client,messages,_,josepy,*_=official()
    network=client.ClientNetwork(josepy.JWKRSA(key=account_key),account=account,verify_ssl=True,
                                timeout=10,user_agent="CRAYS-root-finite-dns01-bootstrap01")
    directory=messages.Directory.from_json(network.get(DIRECTORY).json())
    return client.ClientV2(directory,network)
def snapshot(obj):
    return json.loads(obj.json_dumps())
def challenge_rows(order,key):
    _,messages,challenges,*_=official()
    identifiers=[a.body.identifier.value for a in order.authorizations]
    require(len(identifiers)==19 and set(identifiers)==set(NAMES),"AUTH_IDENTIFIERS")
    rows=[]
    for auth in order.authorizations:
        require(auth.body.status==messages.STATUS_PENDING,"AUTH_NOT_PENDING")
        choices=[c for c in auth.body.challenges if isinstance(c.chall,challenges.DNS01)]
        require(len(choices)==1,"DNS01_UNIQUE")
        c=choices[0];name=auth.body.identifier.value
        rows.append({"owner":c.chall.validation_domain_name(name)+".","value":c.chall.validation(key)})
    require(len({r["owner"] for r in rows})==19,"DNS01_OWNER_UNIQUE")
    require(all(re.fullmatch(r"[A-Za-z0-9_-]{43}",r["value"]) for r in rows),"DNS01_VALUE")
    return sorted(rows,key=lambda r:r["owner"])
def begin(args):
    client,messages,_,josepy,x509,hashes,serialization,rsa,NameOID=official()
    require(args.email and re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+",args.email),"ROOT_EMAIL_REQUIRED")
    put("BEGIN_INTENT.json",{"names":NAMES,"directory":DIRECTORY,"oneAttempt":True})
    account_key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    leaf_key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    for name,key in (("account.key.private.pem",account_key),("privkey.private.pem",leaf_key)):
        write(name,key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
    csr=(x509.CertificateSigningRequestBuilder().subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,NAMES[0])]))
         .add_extension(x509.SubjectAlternativeName([x509.DNSName(n) for n in NAMES]),critical=False)
         .sign(leaf_key,hashes.SHA256()).public_bytes(serialization.Encoding.PEM))
    write("csr.pem",csr)
    acme=netclient(account_key)
    require(args.accept_tos_url and args.accept_tos_url==acme.directory.meta.terms_of_service,"ROOT_EXACT_TOS_URL_REQUIRED")
    put("ACCOUNT_CREATE_INTENT.private.json",{"terms":args.accept_tos_url,"contact":["mailto:"+args.email],"directory":DIRECTORY})
    account=acme.new_account(messages.NewRegistration.from_data(email=args.email,terms_of_service_agreed=True))
    put("account.private.json",snapshot(account))
    put("ORDER_CREATE_INTENT.private.json",{"names":NAMES})
    order=acme.new_order(csr)  # Exactly one new_order; no application retry.
    put("order.private.json",{"body":snapshot(order.body),"uri":order.uri,
         "authorizations":[snapshot(a) for a in order.authorizations]})
    rows=challenge_rows(order,josepy.JWKRSA(key=account_key))
    put("DNS01_CHALLENGES.public.json",rows)
    # Only exact public TXT owner/value pairs. No keys/account/order URLs or private digests.
    print(json.dumps(rows,sort_keys=True))
def finalize(args):
    client,messages,challenges,josepy,x509,hashes,serialization,rsa,NameOID=official()
    account_key=serialization.load_pem_private_key(read("account.key.private.pem"),password=None)
    leaf_key=serialization.load_pem_private_key(read("privkey.private.pem"),password=None)
    account=messages.RegistrationResource.from_json(get("account.private.json"))
    saved=get("order.private.json")
    order=messages.OrderResource(body=messages.Order.from_json(saved["body"]),uri=saved["uri"],
          authorizations=[messages.AuthorizationResource.from_json(a) for a in saved["authorizations"]],
          csr_pem=read("csr.pem"))
    key=josepy.JWKRSA(key=account_key)
    rows=challenge_rows(order,key)
    require(rows==get("DNS01_CHALLENGES.public.json"),"ORDER_CHALLENGES_CHANGED")
    # Root supplies fresh raw-authority-derived proof, no DNS API credential is accepted.
    proof=get("DNS01_AUTHORITY_PROOF.json")
    require(proof["challengesSHA256"]==hashlib.sha256(read("DNS01_CHALLENGES.public.json")).hexdigest(),"DNS_PROOF_PIN")
    age=dt.datetime.now(dt.timezone.utc).timestamp()-proof["observedUnix"]
    require(0<=age<=1200,"DNS_PROOF_AGE")
    require(len(proof["answers"])==38,"DNS_PROOF_COUNT")
    expected=set()
    for row in rows:
        name=row["owner"].removeprefix("_acme-challenge.").removesuffix(".")
        zone="crays.world" if name=="member.crays.world" else name.removeprefix("www.")
        for ns in NS[zone]:
            expected.add((row["owner"],ns))
            matching=[a for a in proof["answers"] if a["owner"]==row["owner"] and a["server"]==ns]
            require(len(matching)==1 and matching[0]["authoritative"] is True and matching[0]["rcode"]=="NOERROR" and row["value"] in matching[0]["TXT"],"DNS_PROOF_AUTHORITY_VALUE")
    require({(a["owner"],a["server"]) for a in proof["answers"]}==expected,"DNS_PROOF_EXACT")
    # No challenge acknowledgement before complete proof. Intent is exclusive and never auto-replayed.
    put("FINALIZE_INTENT.json",{"names":NAMES,"oneAttempt":True,"dnsProofObservedUnix":proof["observedUnix"]})
    acme=netclient(account_key,account)
    live=[]
    for auth in order.authorizations:
        auth,_=acme.poll(auth)
        require(auth.body.identifier.value in NAMES,"LIVE_AUTH_NAME")
        if auth.body.status==messages.STATUS_PENDING:
            choices=[c for c in auth.body.challenges if isinstance(c.chall,challenges.DNS01)]
            require(len(choices)==1,"LIVE_DNS01_UNIQUE")
            c=choices[0]
            row={"owner":c.chall.validation_domain_name(auth.body.identifier.value)+".","value":c.chall.validation(key)}
            require(row in rows,"LIVE_DNS01_CHANGED")
            acme.answer_challenge(c,c.response(key))
        else:
            require(auth.body.status==messages.STATUS_VALID,"LIVE_AUTH_STATUS")
        live.append(auth)
    order=order.update(authorizations=live)
    order=acme.poll_and_finalize(order,deadline=dt.datetime.now()+dt.timedelta(seconds=100))
    require(order.body.status==messages.STATUS_VALID and order.fullchain_pem,"CERTIFICATE_NOT_VALID")
    chain=x509.load_pem_x509_certificates(order.fullchain_pem.encode())
    require(len(chain)>=2,"FULLCHAIN_REQUIRED")
    leaf=chain[0]
    sans=leaf.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    require(len(sans)==19 and set(sans.get_values_for_type(x509.DNSName))==set(NAMES),"CERTIFICATE_EXACT_SAN19")
    encode=lambda k:k.public_bytes(serialization.Encoding.DER,serialization.PublicFormat.SubjectPublicKeyInfo)
    require(encode(leaf.public_key())==encode(leaf_key.public_key()),"CERTIFICATE_KEY")
    now=dt.datetime.now(dt.timezone.utc)
    require(leaf.not_valid_before.replace(tzinfo=dt.timezone.utc)<=now<leaf.not_valid_after.replace(tzinfo=dt.timezone.utc),"CERTIFICATE_DATES")
    write("leaf.public.pem",leaf.public_bytes(serialization.Encoding.PEM))
    write("intermediates.public.pem",b"".join(c.public_bytes(serialization.Encoding.PEM) for c in chain[1:]))
    verified=subprocess.run(["/usr/bin/openssl","verify","-purpose","sslserver","-CAfile","/etc/ssl/certs/ca-certificates.crt",
              "-untrusted",str(STATE/"intermediates.public.pem"),str(STATE/"leaf.public.pem")],
              capture_output=True,timeout=10,check=False)
    require(verified.returncode==0,"PUBLIC_SYSTEM_TRUST_REQUIRED")
    write("fullchain.public.pem",order.fullchain_pem)
    put("FINALIZED_PUBLIC_ACTUAL.json",{"status":"PUBLIC_TRUSTED_CERTIFICATE_ISSUED_NOT_INSTALLED","names":NAMES,
        "notAfterUTC":leaf.not_valid_after.replace(tzinfo=dt.timezone.utc).isoformat(),
        "certificateSHA256":hashlib.sha256(leaf.public_bytes(serialization.Encoding.DER)).hexdigest(),
        "systemTrustVerified":True,"runtimeInstalled":False})
    print(json.dumps(get("FINALIZED_PUBLIC_ACTUAL.json"),sort_keys=True))
def main():
    global FD
    logging.disable(logging.CRITICAL)
    require(os.geteuid()==0,"ROOT_REQUIRED")
    os.umask(0o077)
    p=argparse.ArgumentParser()
    p.add_argument("phase",choices=["begin","finalize"])
    p.add_argument("--email")
    p.add_argument("--accept-tos-url")
    args=p.parse_args()
    # All dependencies/version checks before creating the exclusive intent directory.
    official()
    parent=STATE.parent
    s=parent.lstat()
    require(stat.S_ISDIR(s.st_mode) and s.st_uid==0 and s.st_gid==0 and stat.S_IMODE(s.st_mode)==0o700,"ROOT_PRIVATE_PARENT")
    if args.phase=="begin": STATE.mkdir(mode=0o700)
    s=STATE.lstat()
    require(stat.S_ISDIR(s.st_mode) and s.st_uid==0 and s.st_gid==0 and stat.S_IMODE(s.st_mode)==0o700,"ROOT_STATE_CUSTODY")
    FD=os.open(STATE,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    for sig in (signal.SIGTERM,signal.SIGINT,signal.SIGALRM): signal.signal(sig,stop)
    signal.alarm(300 if args.phase=="begin" else 180)
    try:
        (begin if args.phase=="begin" else finalize)(args)
    except BaseException as e:
        # Raw exception/details, tokens, account/order URLs and private values are never printed.
        try:put(args.phase.upper()+"_STOPPED.json",{"status":"STOPPED_INSPECT_SAME_INTENT_NO_BLIND_RETRY","exceptionClass":type(e).__name__,"guardCode":e.args[0] if isinstance(e,GuardError) else None})
        except BaseException:pass
        print(json.dumps({"status":"STOPPED_INSPECT_SAME_INTENT_NO_BLIND_RETRY","exceptionClass":type(e).__name__}),file=sys.stderr)
        return 1
    finally:
        signal.alarm(0)
        os.close(FD)
    return 0
if __name__=="__main__":
    try: sys.exit(main())
    except Exception as e:
        print(json.dumps({"status":"PRE_INTENT_STOP","exceptionClass":type(e).__name__,"guardCode":e.args[0] if isinstance(e,GuardError) else None}),file=sys.stderr);sys.exit(1)
