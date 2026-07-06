import argparse
import os
import sys
from datetime import datetime, timedelta

BACKEND_ROOT = os.getenv('BANTUBUZZ_BACKEND_ROOT', '/var/www/bantubuzz/backend')
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

ENV_FILE = os.getenv('BANTUBUZZ_ENV_FILE', '/etc/bantubuzz/platform.env')


def load_env_file(path):
    if not os.path.exists(path):
        return

    with open(path, 'r', encoding='utf-8') as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue

            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip()

            if not key:
                continue

            if (
                len(value) >= 2
                and value[0] == value[-1]
                and value[0] in ("'", '"')
            ):
                value = value[1:-1]

            os.environ.setdefault(key, value)


load_env_file(ENV_FILE)
os.environ.setdefault('FLASK_ENV', 'production')

from app import create_app, db
from app.models import OTP, User
from sqlalchemy import text


def parse_args():
    parser = argparse.ArgumentParser(
        description='Preview or delete unverified creator/brand users.'
    )
    parser.add_argument(
        '--execute',
        action='store_true',
        help='Actually delete matching users. Omit for dry run.',
    )
    parser.add_argument(
        '--older-than-hours',
        type=int,
        default=0,
        help='Only target users created at least this many hours ago. Default: 0, all unverified users.',
    )
    parser.add_argument(
        '--sample',
        type=int,
        default=20,
        help='Number of matching users to print in the preview.',
    )
    return parser.parse_args()


def build_query(args):
    query = User.query.filter(
        User.is_verified.is_(False),
        User.is_admin.is_(False),
        User.user_type.in_(('creator', 'brand')),
    )

    if args.older_than_hours and args.older_than_hours > 0:
        cutoff = datetime.utcnow() - timedelta(hours=args.older_than_hours)
        query = query.filter(User.created_at <= cutoff)

    return query.order_by(User.created_at.asc(), User.id.asc())


def print_preview(query, sample_size):
    total = query.count()
    creators = query.filter(User.user_type == 'creator').count()
    brands = query.filter(User.user_type == 'brand').count()

    print('mode=dry_run')
    print(f'total_unverified_users={total}')
    print(f'unverified_creators={creators}')
    print(f'unverified_brands={brands}')
    print('sample:')

    for user in query.limit(sample_size).all():
        created = user.created_at.isoformat() if user.created_at else 'unknown'
        print(f'  id={user.id} type={user.user_type} email={user.email} created_at={created}')

    return total


def delete_users(query):
    users = query.all()
    total = len(users)
    user_ids = [user.id for user in users]

    if not user_ids:
        print('mode=execute')
        print('deleted_users=0')
        return

    print('mode=execute')
    print(f'target_users={total}')

    deleted = recursive_delete('users', 'id', user_ids)
    db.session.commit()
    print(f'deleted_users={deleted.get("users", 0)}')
    print('deleted_rows_by_table:')
    for table_name in sorted(deleted):
        print(f'  {table_name}={deleted[table_name]}')
    print('status=success')


def quote_ident(identifier):
    return '"' + identifier.replace('"', '""') + '"'


def get_primary_key_column(table_name):
    row = db.session.execute(
        text(
            """
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public'
                AND tc.table_name = :table_name
                AND tc.constraint_type = 'PRIMARY KEY'
            ORDER BY kcu.ordinal_position
            """
        ),
        {'table_name': table_name},
    ).first()
    return row[0] if row else None


def get_child_foreign_keys(parent_table, parent_column):
    rows = db.session.execute(
        text(
            """
            SELECT
                tc.table_schema,
                tc.table_name,
                kcu.column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND ccu.table_schema = 'public'
                AND ccu.table_name = :parent_table
                AND ccu.column_name = :parent_column
                AND tc.table_schema = 'public'
                AND tc.table_name <> :parent_table
            ORDER BY tc.table_name, kcu.column_name
            """
        ),
        {'parent_table': parent_table, 'parent_column': parent_column},
    ).mappings().all()
    return rows


def recursive_delete(table_name, pk_column, ids, path=None, totals=None):
    if path is None:
        path = []
    if totals is None:
        totals = {}
    ids = [item for item in ids if item is not None]
    if not ids:
        return totals

    path_key = (table_name, pk_column)
    if path_key in path:
        raise RuntimeError(
            'Foreign-key cycle detected while cleaning unverified users: '
            + ' -> '.join([f'{table}.{column}' for table, column in path + [path_key]])
        )

    child_fks = get_child_foreign_keys(table_name, pk_column)
    for row in child_fks:
        child_table = row['table_name']
        child_fk_column = row['column_name']
        child_pk_column = get_primary_key_column(child_table)

        if child_pk_column:
            child_ids = [
                result[0]
                for result in db.session.execute(
                    text(
                        f'SELECT {quote_ident(child_pk_column)} '
                        f'FROM {quote_ident(child_table)} '
                        f'WHERE {quote_ident(child_fk_column)} = ANY(:ids)'
                    ),
                    {'ids': ids},
                ).all()
            ]
            if child_ids:
                recursive_delete(
                    child_table,
                    child_pk_column,
                    child_ids,
                    path + [path_key],
                    totals,
                )

        # Remove any remaining child rows. This also covers tables without a usable PK.
        statement = text(
            f'DELETE FROM {quote_ident(child_table)} '
            f'WHERE {quote_ident(child_fk_column)} = ANY(:ids)'
        )
        result = db.session.execute(statement, {'ids': ids})
        if result.rowcount:
            totals[child_table] = totals.get(child_table, 0) + result.rowcount
            print(
                f'  deleted_references table={child_table} '
                f'column={child_fk_column} rows={result.rowcount}'
            )

    result = db.session.execute(
        text(
            f'DELETE FROM {quote_ident(table_name)} '
            f'WHERE {quote_ident(pk_column)} = ANY(:ids)'
        ),
        {'ids': ids},
    )
    if result.rowcount:
        totals[table_name] = totals.get(table_name, 0) + result.rowcount
        print(f'  deleted_rows table={table_name} rows={result.rowcount}')

    return totals


def main():
    args = parse_args()
    app = create_app()
    with app.app_context():
        query = build_query(args)
        if args.execute:
            delete_users(query)
        else:
            print_preview(query, args.sample)


if __name__ == '__main__':
    main()
