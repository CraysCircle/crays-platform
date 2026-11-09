"use strict";
// Passive runtime-only timing. Never inspect connection options, SQL, parameters or client values.
exports.installPoolWaitObserver = function installPoolWaitObserver(Pool, timing, startupCapture) {
  const prototype = Pool.prototype, original = prototype.connect;
  const poolIds = new WeakMap(); let nextPoolId = 0;
  const ownEmitDescriptor=Object.getOwnPropertyDescriptor(prototype,"emit"),originalEmit=prototype.emit;
  let idleEventsRemaining=16;const idleDeadline=performance.now()+1800000;
  prototype.emit=function(event,...args){
    if(event==='error'&&idleEventsRemaining>0&&performance.now()<idleDeadline){
      idleEventsRemaining--;
      try{
        if(!poolIds.has(this))poolIds.set(this,++nextPoolId);
        const code=args[0]?.code;
        console.info(JSON.stringify({qaPoolIdleError:true,poolIdentity:poolIds.get(this),sqlState:typeof code==='string'&&/^[0-9A-Z]{5}$/.test(code)?code:null,noErrorMessageOrBusinessValues:true}));
      }catch{/* Never change existing Pool error dispatch. */}
    }
    return originalEmit.call(this,event,...args);
  };
  const ownDescriptor = Object.getOwnPropertyDescriptor(prototype, "connect");
  prototype.connect = function (...args) {
    const span = timing.getStore();
    const capture = !span && startupCapture && performance.now() < startupCapture.deadline && startupCapture.remaining > 0;
    if (!span && !capture) return original.apply(this, args);
    if (capture) startupCapture.remaining--;
    if (!poolIds.has(this)) poolIds.set(this, ++nextPoolId);
    const poolIdentity = poolIds.get(this);
    const started = performance.now();
    const counts = () => { try { return {total: this.totalCount, idle: this.idleCount, waiting: this.waitingCount}; } catch { return {}; } };
    const before = counts(); let recorded = false;
    const record = error => {
      if (recorded) return; recorded = true;
      const event = {poolIdentity, durationMs: Math.round((performance.now()-started)*10)/10, failed: !!error, before, after: counts()};
      if (span) span.poolAcquisitions.push(event);
      else startupCapture.record(event);
    };
    const last = args.length - 1;
    if (typeof args[last] === "function") {
      const callback = args[last];
      args[last] = function (...values) { record(values[0]); return callback.apply(this, values); };
    }
    try {
      const result = original.apply(this, args);
      if (result && typeof result.then === "function") result.then(() => record(null), error => record(error));
      return result;
    } catch (error) { record(error); throw error; }
  };
  return function restore() { if (ownDescriptor) Object.defineProperty(prototype, "connect", ownDescriptor); else delete prototype.connect; if(ownEmitDescriptor)Object.defineProperty(prototype,"emit",ownEmitDescriptor);else delete prototype.emit; };
};
