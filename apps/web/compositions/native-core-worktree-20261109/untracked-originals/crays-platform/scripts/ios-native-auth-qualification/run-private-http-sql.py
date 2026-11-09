"""Finite private-network entrypoint; drop root before loading mutable Core code."""
import os, pathlib, subprocess, sys, runpy
assert sys.argv[1:] in (['v61'],['v62'],['v67'],['v68'],['v75'],['v76'],['v77'],['v78'],['v79'],['v84'],['v85'],['v86'],['v87'],['v88'],['v89'],['v90'],['v96'],['v97'],['v98'],['v99'],['v100'])
assert os.getuid()==0 and os.readlink('/proc/self/ns/net')!=os.environ['CRAYS_NATIVE_EXPECTED_HOST_NETNS']
subprocess.run(['/usr/sbin/ip','address','add','192.0.2.20/32','dev','lo'],check=True,timeout=5)
os.setgroups([]);os.setgid(1000);os.setuid(1000)
assert os.getresuid()==(1000,1000,1000) and os.getresgid()==(1000,1000,1000)
assert int(next(x.split()[1] for x in pathlib.Path('/proc/self/status').read_text().splitlines() if x.startswith('CapEff:')),16)==0
runpy.run_path('/srv/crays/worktrees/ios-core-native-01a14a1b/crays-platform/scripts/ios-native-auth-qualification/run-http-sql.py',run_name='__main__')
