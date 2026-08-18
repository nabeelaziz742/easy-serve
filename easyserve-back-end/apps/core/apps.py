from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'

    def ready(self):
        # Enable SQLite's WAL (Write-Ahead Logging) journal mode so that
        # the frequent polling requests from the waiter/chef/manager
        # dashboards (reads) don't get blocked by, or block, order-update
        # requests (writes) happening at the same time. Without this,
        # concurrent requests intermittently fail with
        # "database is locked" under SQLite's default rollback journal.
        from django.db.backends.signals import connection_created

        def _enable_sqlite_wal(sender, connection, **kwargs):
            if connection.vendor == 'sqlite':
                cursor = connection.cursor()
                cursor.execute('PRAGMA journal_mode=WAL;')
                cursor.execute('PRAGMA synchronous=NORMAL;')

        connection_created.connect(_enable_sqlite_wal)