import frappe
from frappe.tests import IntegrationTestCase

from lms.lms.api import get_sidebar_settings


class TestSidebarSettings(IntegrationTestCase):
	"""The admin's sidebar pages come back in the table's own order."""

	def setUp(self):
		settings = frappe.get_single("LMS Settings")
		self.addCleanup(self._restore, [row.as_dict() for row in settings.sidebar_items])

	def _restore(self, rows):
		settings = frappe.get_single("LMS Settings")
		settings.set("sidebar_items", [])
		for row in rows:
			settings.append("sidebar_items", {"web_page": row.web_page, "icon": row.icon})
		settings.save(ignore_permissions=True)

	def _page(self, title):
		return frappe.get_doc(
			{
				"doctype": "Web Page",
				"title": title,
				"route": frappe.scrub(f"{title}-{frappe.generate_hash(length=6)}"),
				"published": 0,
			}
		).insert(ignore_permissions=True)

	def test_web_pages_follow_the_table_order_not_creation(self):
		# Created first, placed last: the default order (newest first) and the
		# table order disagree, and only the table order is the admin's.
		older = self._page("Older")
		newer = self._page("Newer")
		settings = frappe.get_single("LMS Settings")
		settings.set("sidebar_items", [])
		settings.append("sidebar_items", {"web_page": older.name, "icon": "Bot"})
		settings.append("sidebar_items", {"web_page": newer.name, "icon": "FileText"})
		settings.save(ignore_permissions=True)

		pages = get_sidebar_settings()["web_pages"]

		self.assertEqual([page.web_page for page in pages], [older.name, newer.name])
