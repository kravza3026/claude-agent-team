#!/bin/sh
# log.sh <agent> <queued|running|done|failed> "<опис>" — запис кроку плану оркестратора в events.jsonl
node -e '
const [d,a,s,m]=process.argv.slice(1);
require("fs").appendFileSync(d+"/events.jsonl",JSON.stringify({t:Date.now(),event:"Plan",agent:a,status:s,detail:(m||"").slice(0,240)})+"\n")
' "$(dirname "$0")" "$1" "$2" "$3"
