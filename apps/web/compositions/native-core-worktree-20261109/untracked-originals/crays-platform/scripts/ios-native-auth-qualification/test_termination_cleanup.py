"""Real signal delivery to own disposable Python child, no SQL or shared lease."""
import importlib.util,json,os,pathlib,signal,subprocess,sys,tempfile,time,unittest
SCRIPT=pathlib.Path(__file__).with_name('run-http-sql.py').resolve()
class TerminationCleanup(unittest.TestCase):
 def test_actual_sigterm_unwinds_finally_and_repeated_signal_preserves_cleanup(self):
  with tempfile.TemporaryDirectory() as folder:
   root=pathlib.Path(folder)
   child='''import importlib.util,pathlib,signal,sys,time,os
spec=importlib.util.spec_from_file_location('qualifier',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=pathlib.Path(sys.argv[2])
def work():
 try:
  (r/'ready').write_text(str(os.getpid()))
  signal.pause()
 finally:
  (r/'cleanup-entered').write_text('own fixture only')
  time.sleep(0.3)
  (r/'cleanup-finished').write_text('yes')
sys.exit(m.run_with_termination_cleanup(work))
'''
   process=subprocess.Popen([sys.executable,'-c',child,str(SCRIPT),str(root)],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
   def wait_for(name):
    deadline=time.monotonic()+5
    while not (root/name).exists():
     if process.poll() is not None: self.fail('Child terminated before '+name)
     if time.monotonic()>deadline:self.fail('Bounded marker deadline: '+name)
     time.sleep(0.01)
   try:
    wait_for('ready');self.assertEqual(int((root/'ready').read_text()),process.pid)
    process.send_signal(signal.SIGTERM);wait_for('cleanup-entered');process.send_signal(signal.SIGTERM)
    stdout,stderr=process.communicate(timeout=5)
    self.assertEqual(process.returncode,143,stderr.decode());self.assertEqual((root/'cleanup-finished').read_text(),'yes')
    self.assertEqual(stdout,b'');self.assertFalse(pathlib.Path('/proc/'+str(process.pid)).exists())
   finally:
    if process.poll() is None:process.kill();process.wait(timeout=5)
 def test_original_handler_restored_and_normal_result_preserved(self):
  spec=importlib.util.spec_from_file_location('qualifier',SCRIPT);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  before=signal.getsignal(signal.SIGTERM);self.assertEqual(m.run_with_termination_cleanup(lambda:75),75);self.assertEqual(signal.getsignal(signal.SIGTERM),before)
 def test_unrelated_failure_is_not_relabelled_as_signal(self):
  spec=importlib.util.spec_from_file_location('qualifier',SCRIPT);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  def fail():raise RuntimeError('fixture failure')
  before=signal.getsignal(signal.SIGTERM)
  with self.assertRaisesRegex(RuntimeError,'fixture failure'):m.run_with_termination_cleanup(fail)
  self.assertEqual(signal.getsignal(signal.SIGTERM),before)
if __name__=='__main__':unittest.main()
