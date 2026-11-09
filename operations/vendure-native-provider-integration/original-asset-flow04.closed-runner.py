def run_original_asset_flow_closed(source,timeout,heap=96,body=None):
    command='ulimit -c 0 || exit 3; exec /usr/local/bin/node --max-old-space-size='+str(heap)+' -e "$1"'
    q=dock(["exec","-i",CID,"/bin/sh","-c",command,"own-vendure-probe",source],timeout,body)
    try:j=json.loads(q.stdout)
    except BaseException:raise RuntimeError("NATIVE_NODE_CLOSED_RESULT_HOLD")
    need(q.returncode in (0,3) and len(q.stderr)==0 and isinstance(j,dict),"NATIVE_NODE_STATUS_HOLD")
    keys={"status","nativeAdminLogin","nativeAssetRead","graphQLPrivateURL","getExactOriginalBytes","headExactNoBody","anonymousDenied","ownedLogout","ownedLogoutTokenDenied","originalFileStable","nativeProductCount","privateValuesExported","bodySHAExported","coredumpDisabled","automaticRetry","ownedLogoutUncertain","failureStage","metadataDiagnostic","diagnosticOnly","credentialStable"}
    need(set(j)==keys,"CLOSED_NATIVE_SCHEMA")
    boolean=keys-{"status","nativeProductCount","failureStage","metadataDiagnostic"}
    need(all(type(j[k])is bool for k in boolean),"CLOSED_NATIVE_BOOLS")
    need(j["nativeProductCount"]is None and j["diagnosticOnly"]is False,"DIAGNOSTIC_NO_ACTUAL_VALUES")
    stages={"READINESS","ORIGINAL_ASSET_SELECTION","CORE_LIMIT_PRECHECK","PROTECTED_CREDENTIAL_READ","LOGIN_RESPONSE","NATIVE_ASSET_METADATA","ASSET_URL_AND_ORIGINAL_FILE","AUTHORIZED_GET","AUTHORIZED_HEAD","ANONYMOUS_DENIAL","ORIGINAL_FILE_STABILITY","OWNED_LOGOUT","OWNED_LOGOUT_TOKEN_DENIAL"}
    need(j["failureStage"]is None or j["failureStage"]in stages,"CLOSED_NATIVE_STAGE")
    need(j["status"]in("ORIGINAL_NATIVE_ASSET_DELIVERY_PASS","NATIVE_ASSET_FLOW_HOLD","NATIVE_ASSET_FLOW_DEADLINE_UNKNOWN"),"CLOSED_NATIVE_STATUS")
    need(j["privateValuesExported"]is False and j["bodySHAExported"]is False and j["automaticRetry"]is False,"CLOSED_NATIVE_PRIVACY")
    m=j["metadataDiagnostic"]
    mkeys={"assetsKind","itemsKind","itemsReturnedBucket","sourceMatchesSelectedName","mimeMatchesOriginal","phase","responseReturned","httpClass","bodyReadCompleted","jsonParsed","rootKind","dataKind","errorsKind","errorsCountCapped","errorsTruncated","errorCodes","errorPaths","knownUrlContractError","assetKind","fileSizeKind","fileSizeMatchesExpected","sourceKind","previewKind","mimeTypeKind","productsKind","totalItemsKind","productCountMatchesOriginalObservation","noGraphQLErrors","sourcePrivateCanonical","previewEmptyOrPrivateCanonical"}
    need(isinstance(m,dict)and set(m)==mkeys,"CLOSED_METADATA_SCHEMA")
    kinds={"UNSEEN","MISSING","NULL","ARRAY","OBJECT","STRING","NUMBER","OTHER"}
    kindkeys={"assetsKind","itemsKind","rootKind","dataKind","errorsKind","assetKind","fileSizeKind","sourceKind","previewKind","mimeTypeKind","productsKind","totalItemsKind"}
    need(all(m[k]in kinds for k in kindkeys),"CLOSED_METADATA_KINDS")
    mbool=mkeys-kindkeys-{"phase","httpClass","itemsReturnedBucket","errorsCountCapped","errorCodes","errorPaths"}
    need(all(type(m[k])is bool for k in mbool),"CLOSED_METADATA_BOOLS")
    need(m["phase"]in("NOT_STARTED","FETCH","BODY_READ","JSON_PARSE","SHAPE","CAPTURED")and m["httpClass"]in("NONE","1XX","2XX","3XX","4XX","5XX","OTHER"),"CLOSED_METADATA_ENUM")
    need(m["itemsReturnedBucket"]in("UNSEEN","ZERO","ONE","TWO_OR_MORE"),"CLOSED_ASSET_ITEMS_BUCKET")
    need(type(m["errorsCountCapped"])is int and 0<=m["errorsCountCapped"]<=16,"CLOSED_ERROR_COUNT")
    codes={"FORBIDDEN","UNAUTHORIZED","INTERNAL_SERVER_ERROR","BAD_USER_INPUT","GRAPHQL_VALIDATION_FAILED","GRAPHQL_PARSE_FAILED","OTHER_REDACTED"}
    need(isinstance(m["errorCodes"],list)and len(m["errorCodes"])<=7 and all(type(x)is str and x in codes for x in m["errorCodes"]),"CLOSED_ERROR_CODES")
    paths={"assets","items","id","source","preview","fileSize","mimeType","products","totalItems"}
    need(isinstance(m["errorPaths"],list)and len(m["errorPaths"])<=16,"CLOSED_ERROR_PATHS")
    for path in m["errorPaths"]:
        need(type(path)is str and(path in("ROOT_OR_ABSENT","OTHER_REDACTED")or 1<=len(path.split("."))<=4 and all(x in paths for x in path.split("."))),"CLOSED_ERROR_PATH_TOKEN")
    proof=("nativeAdminLogin","nativeAssetRead","graphQLPrivateURL","getExactOriginalBytes","headExactNoBody","anonymousDenied","ownedLogout","ownedLogoutTokenDenied","originalFileStable","coredumpDisabled","credentialStable")
    if j["status"]=="ORIGINAL_NATIVE_ASSET_DELIVERY_PASS":
        need(q.returncode==0 and j["failureStage"]is None and all(j[k]is True for k in proof)and j["ownedLogoutUncertain"]is False and m["phase"]=="CAPTURED"and m["sourceMatchesSelectedName"]is True and m["mimeMatchesOriginal"]is True and m["fileSizeMatchesExpected"]is True,"CLOSED_ORIGINAL_ASSET_FLOW_PASS")
    else:
        need(q.returncode==3 and j["failureStage"]in stages,"CLOSED_NATIVE_FAILURE")
    if j["ownedLogoutUncertain"]:
        disposition="UNCERTAIN"
    elif j["ownedLogout"]:
        disposition="LOGGED_OUT"
    else:
        need(j["nativeAdminLogin"]is False,"CLOSED_NATIVE_SESSION_STATE")
        disposition="NOT_ACQUIRED"
    return {"nodeExitCode":q.returncode,"dockerCLIWaitReturned":True,"ownDockerCLIReaped":True,"stderrBytesZero":True,"nativeOutcome":j,"ownedSessionDisposition":disposition,"newLoginOrProbeRetryPermitted":False,"functionalAcceptance":j["status"]=="ORIGINAL_NATIVE_ASSET_DELIVERY_PASS"}
