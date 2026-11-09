def run_node_closed(source,timeout,heap=96,body=None):
    command='ulimit -c 0 || exit 3; exec /usr/local/bin/node --max-old-space-size='+str(heap)+' -e "$1"'
    q=dock(["exec","-i",CID,"/bin/sh","-c",command,"own-vendure-probe",source],timeout,body)
    try:j=json.loads(q.stdout)
    except BaseException:raise RuntimeError("NATIVE_NODE_CLOSED_RESULT_HOLD")
    need(q.returncode in (0,3) and len(q.stderr)==0 and isinstance(j,dict),"NATIVE_NODE_STATUS_HOLD")
    keys={"status","nativeAdminLogin","nativeAssetRead","graphQLPrivateURL","getExactOriginalBytes","headExactNoBody","anonymousDenied","ownedLogout","ownedLogoutTokenDenied","originalFileStable","nativeProductCount","privateValuesExported","bodySHAExported","coredumpDisabled","automaticRetry","ownedLogoutUncertain","failureStage"}
    need(set(j)==keys,"CLOSED_NATIVE_SCHEMA")
    boolean=keys-{"status","nativeProductCount","failureStage"}
    need(all(type(j[k])is bool for k in boolean),"CLOSED_NATIVE_BOOLS")
    need(j["nativeProductCount"]is None or type(j["nativeProductCount"])is int and j["nativeProductCount"]==115,"CLOSED_NATIVE_COUNT")
    stages={"READINESS","CORE_LIMIT_PRECHECK","PROTECTED_CREDENTIAL_READ","LOGIN_RESPONSE","NATIVE_ASSET_METADATA","ASSET_URL_AND_ORIGINAL_FILE","AUTHORIZED_GET","AUTHORIZED_HEAD","ANONYMOUS_DENIAL","ORIGINAL_FILE_STABILITY","OWNED_LOGOUT","OWNED_LOGOUT_TOKEN_DENIAL"}
    need(j["failureStage"]is None or j["failureStage"]in stages,"CLOSED_NATIVE_STAGE")
    need(j["status"]in("ORIGINAL_NATIVE_ASSET_DELIVERY_PASS","NATIVE_ASSET_FLOW_HOLD","NATIVE_ASSET_FLOW_DEADLINE_UNKNOWN"),"CLOSED_NATIVE_STATUS")
    need(j["privateValuesExported"]is False and j["bodySHAExported"]is False and j["automaticRetry"]is False,"CLOSED_NATIVE_PRIVACY")
    proof=("nativeAdminLogin","nativeAssetRead","graphQLPrivateURL","getExactOriginalBytes","headExactNoBody","anonymousDenied","ownedLogout","ownedLogoutTokenDenied","originalFileStable","coredumpDisabled")
    if j["status"]=="ORIGINAL_NATIVE_ASSET_DELIVERY_PASS":
        need(q.returncode==0 and j["failureStage"]is None and all(j[k]is True for k in proof)and j["nativeProductCount"]==115 and j["ownedLogoutUncertain"]is False,"CLOSED_NATIVE_PASS")
    else:
        need(q.returncode==3 and j["failureStage"]in stages,"CLOSED_NATIVE_FAILURE")
    if j["ownedLogoutUncertain"]:
        disposition="UNCERTAIN"
    elif j["ownedLogout"]:
        disposition="LOGGED_OUT"
    else:
        need(j["nativeAdminLogin"]is False,"CLOSED_NATIVE_SESSION_STATE")
        disposition="NOT_ACQUIRED"
    return {"nodeExitCode":q.returncode,"dockerCLIWaitReturned":True,"ownDockerCLIReaped":True,"stderrBytesZero":True,"nativeOutcome":j,"ownedSessionDisposition":disposition,"newLoginOrProbeRetryPermitted":False}
