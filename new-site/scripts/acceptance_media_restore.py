"""Disposable upload-volume backup/restore drill; no shop uploads are mounted."""
import subprocess,hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
image="wk-select-new-api"
def run(volume,code,data=None):
    return subprocess.check_output(["docker","run","--rm","-i","--user","root","--entrypoint","python","-v",volume+":/qa",image,"-c",code],input=data)
source="wk_acceptance_media_source"
target="wk_acceptance_media_restore"
run(source,"from pathlib import Path; p=Path('/qa/fixture.txt'); p.write_bytes(b'acceptance-upload-only-20261029')")
archive=run(source,"import sys,tarfile; t=tarfile.open(fileobj=sys.stdout.buffer,mode='w|'); t.add('/qa/fixture.txt',arcname='fixture.txt'); t.close()")
run(target,"import sys,tarfile; t=tarfile.open(fileobj=sys.stdin.buffer,mode='r|'); t.extractall('/qa',filter='data')",archive)
a=run(source,"from pathlib import Path; import sys;sys.stdout.buffer.write(Path('/qa/fixture.txt').read_bytes())")
b=run(target,"from pathlib import Path; import sys;sys.stdout.buffer.write(Path('/qa/fixture.txt').read_bytes())")
assert a==b
result={"result":"PASS","restored_sha256":hashlib.sha256(b).hexdigest(),"shop_uploads_untouched":True}
(root/'test-results/media-restore.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))
