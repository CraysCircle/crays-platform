"""Actual flock and registry-denial observations on own temporary metadata only.
No original registry mutation, lease release, subprocess or PostgreSQL start.
"""
import contextlib, fcntl, hashlib, importlib.util, io, json, pathlib, sys, tempfile, unittest
from unittest.mock import patch

SCRIPT=pathlib.Path(__file__).with_name('run-http-sql.py')
class ResourceAdmission(unittest.TestCase):
 def setUp(self):
  spec=importlib.util.spec_from_file_location('isolated_native_qualifier',SCRIPT);self.module=importlib.util.module_from_spec(spec);spec.loader.exec_module(self.module)
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=pathlib.Path(self.temp.name)
  folder=self.root/'scripts/ios-native-auth-qualification';folder.mkdir(parents=True)
  node=pathlib.Path(sys.executable).resolve();(folder/'runtime-node-sdk4.json').write_text(json.dumps({'path':str(node),'sha256':hashlib.sha256(node.read_bytes()).hexdigest()}))
  self.registry=self.root/'LEASES.json';self.registry.write_text(json.dumps({'heavy':[{'leaseId':'foreign-test','pid':99999999}]}))
  self.locks=[self.root/('coordination-'+str(i)+'.lock') for i in range(4)]
  for lock in self.locks:lock.touch(mode=0o600)
  self.module.ROOT=self.root;self.module.REGISTRY=self.registry;self.module.LOCKS=self.locks;self.module.qualification_inputs=lambda:{}
 def invoke(self):
  before=self.registry.read_bytes();out=io.StringIO()
  # Any process creation here is an actual test failure, not a fake SQL PASS.
  with patch.object(sys,'argv',[str(SCRIPT),'v80']),patch.object(self.module.subprocess,'run',side_effect=AssertionError('No child before admission')),contextlib.redirect_stdout(out):
   code=self.module.main()
  self.assertEqual(code,75);self.assertEqual(self.registry.read_bytes(),before);self.assertFalse((self.root/'.qualification').exists())
  return out.getvalue()
 def test_actual_held_mutex_returns_no_queue_without_worker_or_lease(self):
  with self.locks[2].open('r') as holder:
   fcntl.flock(holder,fcntl.LOCK_EX|fcntl.LOCK_NB)
   self.assertIn('WAIT_RESOURCE_COORDINATION_LOCK_NO_QUEUE',self.invoke())
  # Partial acquisition did not leak descriptors/locks into the process.
  for lock in self.locks:
   with lock.open('r') as reader:fcntl.flock(reader,fcntl.LOCK_EX|fcntl.LOCK_NB)
 def test_foreign_registry_lease_is_preserved_even_when_pid_is_absent(self):
  self.assertIn('WAIT_RESOURCE_OCCUPIED_NO_QUEUE',self.invoke())
 def test_registry_write_fault_is_not_misreported_as_mutex_wait(self):
  available=int(next(line.split()[1] for line in pathlib.Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:')))*1024
  if available<4*1024**3:self.skipTest('Original minimum memory admission unavailable')
  self.registry.write_text(json.dumps({'heavy':[]}));before=self.registry.read_bytes()
  with patch.object(sys,'argv',[str(SCRIPT),'v80']),patch.object(self.module.subprocess,'run',side_effect=AssertionError('No worker')),patch.object(self.module,'write_registry',side_effect=BlockingIOError('synthetic registry IO failure')):
   with self.assertRaises(BlockingIOError):self.module.main()
  self.assertEqual(self.registry.read_bytes(),before)
if __name__=='__main__':unittest.main()
