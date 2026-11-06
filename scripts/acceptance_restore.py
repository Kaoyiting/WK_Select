"""Restore disposable test DB only; never reads or overwrites the active shop DB."""
import subprocess,json,hashlib
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlsplit
root=Path(__file__).resolve().parents[1]
url=(root/".secrets/test_database_url").read_text().strip()
source=urlsplit(url).path.lstrip("/")
assert source.endswith("_test") and source.replace("_","").isalnum()
target="wk_acceptance_restore_"+datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
dest=root/"test-results"/target
dest.mkdir(parents=True)
base=["docker","compose","exec","-T","db"]
def run(args,data=None):
    return subprocess.check_output(base+args,input=data,cwd=root)
def sql(db,query):
    return run(["psql","-U","wk_bootstrap","-d",db,"-At","-v","ON_ERROR_STOP=1","-c",query]).decode().strip()
dump=run(["pg_dump","-U","wk_bootstrap","-d",source,"-Fc"])
(dest/"database.dump").write_bytes(dump)
run(["createdb","-U","wk_bootstrap",target])
run(["pg_restore","-U","wk_bootstrap","-d",target,"--no-owner","--exit-on-error"],dump)
tables=sql(source,"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").splitlines()
summary={}
for t in tables:
    assert t.replace("_","").isalnum()
    query=f"SELECT count(*),md5(coalesce(string_agg(j,E'\\n' ORDER BY j),'')) FROM (SELECT row_to_json(x)::text j FROM public.\"{t}\" x) q"
    a,b=sql(source,query),sql(target,query)
    assert a==b,t
    summary[t]=int(a.split("|")[0])
report={"source":source,"restored":target,"tables_verified":len(tables),"row_counts":summary,"sha256":hashlib.sha256(dump).hexdigest(),"result":"PASS","active_shop_database_untouched":True}
(dest/"result.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps({k:v for k,v in report.items() if k!="row_counts"}))
