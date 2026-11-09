"""Frappe auth hook: authenticate first, then fence every dedicated service request."""
import json
import stat
from pathlib import Path
import frappe
from crays_team_scope.policy import Denied, check, dedicated

def enforce():
 user = frappe.session.user
 if not dedicated(user):
  return
 try:
  path = Path(frappe.get_site_path("private", "crays-team-scope.json"))
  require_mode = path.stat().st_mode
  if not stat.S_ISREG(require_mode) or require_mode & 0o022 or path.is_symlink():
   raise Denied("Unsafe Team scope configuration")
  if path.stat().st_size > 524288:
   raise Denied("Oversized Team scope configuration")
  configuration = json.loads(path.read_text())
  binding = configuration["principals"][user]
  request = frappe.request
  if request.content_length and request.content_length > 32768:
   raise Denied("Oversized Team request")
  if request.form or request.files:
   raise Denied("Team service requires JSON")
  raw = request.get_data(cache=True)
  body = None
  if raw:
   if request.mimetype != "application/json":
    raise Denied("Team service requires JSON")
   body = json.loads(raw)
  pairs = list(request.args.items(multi=True))
  check(user, request.method, request.path, pairs, body, binding)
 except (Denied, OSError, KeyError, ValueError, TypeError, AttributeError):
  frappe.throw("Team service request outside approved scope", frappe.PermissionError)
