"""Pure request policy. Native Frappe permissions continue to apply after this guard."""
import json
import re
from datetime import datetime, timezone

PREFIX = "crays-team-test-"
SUFFIX = "@example.invalid"
FIELDS = {
 "Company": {"name", "default_currency"},
 "Currency": {"name", "enabled"},
 "Cost Center": {"name", "company", "disabled"},
 "Branch": {"name", "branch"},
 "Department": {"name", "company"},
 "Employee": {"name", "employee_name", "company", "branch", "department", "user_id", "status"},
 "Shift Type": {"name", "start_time", "end_time"},
 "Shift Assignment": {"name", "employee", "company", "department", "shift_type", "start_date", "end_date", "status", "docstatus", "custom_crays_team_test_key"},
 "Employee Skill Map": {"name", "employee"},
 "Skill": {"name", "skill_name"},
 "LMS Course": {"name", "title", "status", "published", "paid_course", "paid_certificate", "disable_self_learning", "currency", "lessons"},
 "LMS Enrollment": {"name", "member", "course", "progress", "certificate"},
 "LMS Course Progress": {"name", "member", "course", "chapter", "lesson", "status"},
 "LMS Certificate": {"name", "member", "course", "issue_date", "expiry_date"},
 "Course Lesson": {"name", "course", "chapter"},
 "Course Chapter": {"name", "course"},
 "Custom Field": {"name", "dt", "fieldname", "unique", "fieldtype"},
 "LMS Program Member": {"name", "member", "parent"},
}
CREATABLE = {"Shift Assignment", "LMS Enrollment", "LMS Course Progress"}

class Denied(ValueError):
 pass

def require(value):
 if not value:
  raise Denied("Team service request outside approved scope")

def dedicated(user):
 return isinstance(user, str) and user.startswith(PREFIX) and user.endswith(SUFFIX)

def decode(value):
 try:
  return json.loads(value) if isinstance(value, str) else value
 except (ValueError, TypeError):
  raise Denied("Invalid Team request JSON") from None

def check(user, method, path, pairs, body, binding, now=None):
 # Return immediately for unrelated provider identities.
 if not dedicated(user):
  return
 require(isinstance(binding, dict) and binding.get("schema") == 1)
 require(binding.get("principal") == user and binding.get("mode") in ("reader", "fixture"))
 require(binding.get("company") == "CRAYS Club Manager TEST")
 require(binding.get("propertyId") in ("property-clubs-forest-city-golf", "property-clubs-forest-city-marina"))
 require(isinstance(pairs, list) and all(isinstance(p, (list, tuple)) and len(p) == 2 for p in pairs))
 require(all(isinstance(p[0], str) and isinstance(p[1], str) for p in pairs))
 require(len({p[0] for p in pairs}) == len(pairs))
 args = dict(pairs)
 require(method in ("GET", "POST") and "%" not in path and "\\" not in path)
 if path == "/api/method/frappe.auth.get_logged_user":
  require(method == "GET" and not args and body is None)
  return
 require(path.startswith("/api/resource/"))
 parts = path[len("/api/resource/"):].split("/")
 require(len(parts) in (1, 2) and all(parts))
 dt = parts[0]
 require(dt in FIELDS)
 resources = binding.get("resources")
 require(isinstance(resources, dict) and isinstance(resources.get(dt), dict))
 rule = resources[dt]
 if method == "POST":
  require(binding["mode"] == "fixture" and len(parts) == 1 and dt in CREATABLE and not args)
  require(isinstance(body, dict) and body.get("doctype") == dt)
  require(set(body).issubset(FIELDS[dt] | {"doctype"}) and "name" not in body)
  writes = rule.get("writes", [])
  require(isinstance(writes, list) and any(body == allowed for allowed in writes))
  deadline = binding.get("writeExpiresAt")
  try:
   end = datetime.fromisoformat(deadline)
   require(end.tzinfo is not None)
   require((now or datetime.now(timezone.utc)) < end)
  except (ValueError, TypeError):
   raise Denied("Missing or expired Team write lease") from None
  return
 require(body is None)
 if len(parts) == 2:
  # Employee full documents contain private fields at native permlevel 0.
  require(dt == "Employee Skill Map" and not args)
  documents = rule.get("documents", [])
  require(isinstance(documents, list) and parts[1] in documents)
  return
 require(set(args).issubset({"fields", "filters", "limit_page_length", "limit_start", "order_by"}))
 selected = decode(args.get("fields"))
 require(isinstance(selected, list) and 0 < len(selected) <= len(FIELDS[dt]))
 require(all(isinstance(x, str) and x in FIELDS[dt] for x in selected))
 require(len(selected) == len(set(selected)) and "name" in selected)
 for key, default, minimum, maximum in (("limit_page_length", None, 1, 50), ("limit_start", "0", 0, 950)):
  value = args.get(key, default)
  require(isinstance(value, str) and re.fullmatch(r"[0-9]{1,3}", value))
  require(minimum <= int(value) <= maximum)
 require(args.get("order_by", "name asc") == "name asc")
 filters = decode(args.get("filters"))
 require(isinstance(filters, list) and 0 < len(filters) <= 12)
 actual = {}
 for f in filters:
  require(isinstance(f, list) and len(f) == 3)
  field, op, value = f
  require(isinstance(field, str) and field in FIELDS[dt] and field not in actual)
  require(op == "=" and isinstance(value, str) and 0 < len(value) <= 240)
  actual[field] = value
 scopes = rule.get("scopes")
 require(isinstance(scopes, list) and len(scopes) > 0)
 require(any(isinstance(s, dict) and s and all(actual.get(k) == v for k, v in s.items()) for s in scopes))
